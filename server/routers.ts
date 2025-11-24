import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as utils from "./utils";
import { shopifyOAuthRouter } from "./shopify-oauth-router";

export const appRouter = router({
  system: systemRouter,
  shopifyOAuth: shopifyOAuthRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============= Products =============
  products: router({
    list: protectedProcedure.query(async () => {
      const products = await db.getAllProducts();
      return products.map(p => ({
        ...p,
        cogs: p.cogs / 100,
        shippingCost: p.shippingCost / 100,
      }));
    }),

    create: protectedProcedure
      .input(z.object({
        variantId: z.string().min(1),
        sku: z.string().optional(),
        productName: z.string().optional(),
        cogs: z.number().min(0),
        shippingCost: z.number().min(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getProductByVariantId(input.variantId);
        if (existing) {
          // Update existing
          await db.updateProductByVariantId(input.variantId, {
            cogs: Math.round(input.cogs * 100),
            shippingCost: Math.round(input.shippingCost * 100),
          });
          return { success: true, message: "Product updated" };
        } else {
          // Create new
          await db.createProduct({
            userId: ctx.user.id,
            variantId: input.variantId,
            sku: input.sku || null,
            productName: input.productName || null,
            cogs: Math.round(input.cogs * 100),
            shippingCost: Math.round(input.shippingCost * 100),
          });
          return { success: true, message: "Product created" };
        }
      }),

    update: protectedProcedure
      .input(z.object({
        sku: z.string().min(1),
        cogs: z.number().min(0),
        shippingCost: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        await db.updateProduct(input.sku, {
          cogs: Math.round(input.cogs * 100),
          shippingCost: Math.round(input.shippingCost * 100),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ sku: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteProduct(input.sku);
        return { success: true };
      }),

    importCSV: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const rows = utils.parseCSV(input.csvContent);
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
          try {
            const variantId = row.variant_id || row.variantId || row.VARIANT_ID;
            const sku = row.sku || row.SKU;
            const productName = row.product_name || row.productName || row.PRODUCT_NAME;
            const cogs = parseFloat(row.cogs || row.COGS || '0');
            const shippingCost = parseFloat(row.shipping_cost || row.shipping || '0');

            if (!variantId) {
              failed++;
              errors.push("Missing variant_id");
              continue;
            }

            await db.createProduct({
              userId: ctx.user.id,
              variantId,
              sku: sku || null,
              productName: productName || null,
              cogs: Math.round(cogs * 100),
              shippingCost: Math.round(shippingCost * 100),
            });
            success++;
          } catch (error) {
            failed++;
            errors.push(String(error));
          }
        }

        return { success, failed, errors: errors.slice(0, 10) };
      }),

    importShopifyProducts: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { getShopifyProducts } = await import("./shopify-products");
        const shopifyProducts = await getShopifyProducts();
        
        // Get existing products to avoid duplicates (by variantId)
        const existingProducts = await db.getAllProducts();
        const existingVariantIds = new Set(existingProducts.map(p => p.variantId));
        
        let imported = 0;
        let skipped = 0;
        
        for (const product of shopifyProducts) {
          try {
            if (!existingVariantIds.has(product.variantId)) {
              // Create with default COGS (0) - user will need to set these
              await db.createProduct({
                userId: ctx.user.id,
                variantId: product.variantId,
                sku: product.sku || null, // Optional SKU
                productName: product.productName,
                cogs: 0,
                shippingCost: 0,
              });
              imported++;
              console.log(`[Import] Created product: ${product.variantId} - ${product.productName}`);
            } else {
              skipped++;
              console.log(`[Import] Skipped existing product: ${product.variantId}`);
            }
          } catch (error) {
            console.error(`[Import] Failed to create product ${product.variantId}:`, error);
            skipped++;
          }
        }
        
        return { imported, skipped, total: shopifyProducts.length };
      }),

    updateTiers: protectedProcedure
      .input(z.object({
        variantId: z.string().min(1),
        cogs: z.number().min(0),
        shippingTiers: z.string().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateProductTiers(input.variantId, {
          cogs: Math.round(input.cogs * 100), // Convert to cents
          shippingTiers: input.shippingTiers,
        });
        return { success: true };
      }),
  }),

  // ============= Expenses =============
  expenses: router({
    list: protectedProcedure.query(async () => {
      const expenses = await db.getAllExpenses();
      return expenses.map(e => ({
        ...e,
        amount: e.amount / 100,
      }));
    }),

    create: protectedProcedure
      .input(z.object({
        category: z.string().min(1),
        amount: z.number().min(0),
        expenseType: z.enum(["one_time", "monthly", "yearly"]),
        date: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createExpense({
          category: input.category,
          amount: Math.round(input.amount * 100),
          expenseType: input.expenseType,
          date: input.date,
          startDate: input.startDate,
          endDate: input.endDate,
          description: input.description,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteExpense(input.id);
        return { success: true };
      }),

    importCSV: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const rows = utils.parseCSV(input.csvContent);
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
          try {
            const category = row.category;
            const amount = parseFloat(row.amount || '0');
            const expenseType = row.expense_type as "one_time" | "monthly" | "yearly";

            if (!category || !expenseType) {
              failed++;
              errors.push("Missing category or expense_type");
              continue;
            }

            await db.createExpense({
              category,
              amount: Math.round(amount * 100),
              expenseType,
              date: row.date || undefined,
              startDate: row.start_date || undefined,
              endDate: row.end_date || undefined,
              description: row.description || undefined,
            });
            success++;
          } catch (error) {
            failed++;
            errors.push(String(error));
          }
        }

        return { success, failed, errors: errors.slice(0, 10) };
      }),
  }),

  // ============= Disputes =============
  disputes: router({
    list: protectedProcedure.query(async () => {
      const disputes = await db.getAllDisputes();
      return disputes.map(d => ({
        ...d,
        amount: d.amount / 100,
      }));
    }),

    create: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        amount: z.number().min(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDispute({
          startDate: input.startDate,
          endDate: input.endDate,
          amount: Math.round(input.amount * 100),
          notes: input.notes,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDispute(input.id);
        return { success: true };
      }),
  }),

  // ============= Settings =============
  settings: router({
    get: protectedProcedure.query(async () => {
      const facebook = await db.getApiCredential("facebook");
      const shopify = await db.getApiCredential("shopify");

      return {
        facebook: facebook ? {
          hasToken: !!facebook.accessToken,
          accountId: facebook.accountId || "",
        } : { hasToken: false, accountId: "" },
        shopify: shopify ? {
          hasToken: !!shopify.accessToken,
          storeDomain: shopify.storeDomain || "",
        } : { hasToken: false, storeDomain: "" },
      };
    }),

    saveFacebook: protectedProcedure
      .input(z.object({
        accessToken: z.string().optional(),
        accountId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getApiCredential("facebook");
        await db.upsertApiCredential({
          service: "facebook",
          accessToken: input.accessToken ? utils.encrypt(input.accessToken) : existing?.accessToken,
          accountId: input.accountId || existing?.accountId,
        });
        return { success: true };
      }),

    saveShopify: protectedProcedure
      .input(z.object({
        accessToken: z.string().optional(),
        storeDomain: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getApiCredential("shopify");
        await db.upsertApiCredential({
          service: "shopify",
          accessToken: input.accessToken ? utils.encrypt(input.accessToken) : existing?.accessToken,
          storeDomain: input.storeDomain || existing?.storeDomain,
        });
        return { success: true };
      }),
  }),

  // ============= Orders =============
  orders: router({ list: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // Query webhook data from database
        let startDateObj: Date | undefined;
        let endDateObj: Date | undefined;
        
        if (input.startDate && input.endDate) {
          // Parse dates and set to start/end of day in local timezone
          startDateObj = new Date(input.startDate + 'T00:00:00');
          endDateObj = new Date(input.endDate + 'T23:59:59.999');
        }
        
        const dbOrders = await db.getShopifyOrdersFromDb(startDateObj, endDateObj);
        
        // Get line items for all orders
        const orderIds = dbOrders.map(o => o.id);
        const lineItems = await db.getShopifyOrderItems(orderIds);
        
        // Convert to format expected by frontend
        const orders = dbOrders.map(order => {
          const orderLineItems = lineItems.filter(item => item.orderId === order.id);
          const orderData = order.orderData ? JSON.parse(order.orderData) : {};
          
          return {
            id: order.shopifyOrderId,
            name: order.orderNumber,
            order_number: order.orderNumber?.replace('#', '') || '', // Remove # for display
            created_at: order.processedAt?.toISOString() || order.createdAt.toISOString(),
            email: order.email,
            financial_status: order.financialStatus,
            fulfillment_status: order.fulfillmentStatus,
            current_total_price: (order.totalPrice / 100).toFixed(2),
            currency: order.currency || 'USD',
            line_items: orderLineItems.map(item => ({
              id: item.lineItemId,
              variant_id: item.variantId,
              product_id: item.productId,
              sku: item.sku,
              name: item.title, // Frontend expects 'name'
              title: item.title,
              variant_title: item.variantTitle,
              quantity: item.quantity,
              price: (item.price / 100).toFixed(2),
            })),
            customer: orderData.customer || { first_name: '', last_name: '' },
          };
        });
        
        // Pagination
        const start = (input.page - 1) * input.limit;
        const end = start + input.limit;
        return {
          orders: orders.slice(start, end),
          total: orders.length,
          page: input.page,
          limit: input.limit,
        };
      }),
  }),

  // ============= Metrics =============
  metrics: router({
    get: protectedProcedure
      .input(z.object({
        period: z.string(),
        customStart: z.string().optional(),
        customEnd: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // Get date range
        let startDate: string, endDate: string;
        if (input.period === "custom" && input.customStart && input.customEnd) {
          startDate = input.customStart;
          endDate = input.customEnd;
        } else {
          const range = utils.getDateRange(input.period);
          startDate = range.startDate;
          endDate = range.endDate;
        }

        // Fetch Facebook ad spend (still using API)
        const { getFacebookAdSpend } = await import("./facebook-ads");
        const adSpend = await getFacebookAdSpend(startDate, endDate);
        
        // Get Shopify data from webhook database
        // Parse dates and set to start/end of day in local timezone
        const startDateObj = new Date(startDate + 'T00:00:00');
        const endDateObj = new Date(endDate + 'T23:59:59.999');
        
        const dbOrders = await db.getShopifyOrdersFromDb(startDateObj, endDateObj);
        const orderIds = dbOrders.map(o => o.id);
        const lineItems = await db.getShopifyOrderItems(orderIds);
        
        // Calculate revenue from webhook data
        let revenue = 0;
        for (const order of dbOrders) {
          revenue += order.totalPrice; // Already in cents
        }
        
        // Calculate COGS and shipping using tiered pricing
        const { totalCOGS, totalShipping } = await db.calculateOrderCostsForPeriod(
          startDateObj,
          endDateObj
        );
        
        // Convert to cents for consistency
        const cogs = Math.round(totalCOGS * 100);
        const shipping = Math.round(totalShipping * 100);
        
        const shopifyData = {
          revenue,
          cogs,
          shipping,
          orderCount: dbOrders.length,
        };

        // Get expenses and disputes from database
        const expenses = await db.getExpensesForPeriod(startDate, endDate);
        const disputes = await db.getDisputesForPeriod(startDate, endDate);

        // Calculate total expenses for period
        let totalExpenses = 0;
        for (const expense of expenses) {
          totalExpenses += utils.calculateExpenseForPeriod(expense, startDate, endDate);
        }

        // Calculate total disputes
        const totalDisputes = disputes.reduce((sum, d) => sum + d.amount, 0);

        // Get exchange rate for USD to EUR conversion
        const { getExchangeRate } = await import('./utils');
        const exchangeRate = await getExchangeRate('USD', 'EUR');
        
        // Fetch processing fees from Shopify Payouts API
        const { getProcessingFees } = await import('./shopify-payouts');
        const processingFeesUSD = await getProcessingFees(startDateObj, endDateObj);
        const processingFeesEUR = Math.round(processingFeesUSD * 100 * exchangeRate); // Convert to cents
        
        // Revenue is in USD cents, convert to EUR cents
        const revenueEUR = Math.round(shopifyData.revenue * exchangeRate);
        const cogsEUR = Math.round(shopifyData.cogs * exchangeRate);
        const shippingEUR = Math.round(shopifyData.shipping * exchangeRate);
        
        const metrics = utils.calculateMetrics({
          revenue: revenueEUR, // Use EUR for calculations
          adSpend: adSpend, // Already in EUR
          cogs: cogsEUR,
          shipping: shippingEUR,
          processingFees: processingFeesEUR,
          operationalExpenses: totalExpenses,
          disputes: totalDisputes,
          orders: shopifyData.orderCount,
        });

        return {
          ...metrics,
          // Return both USD and EUR amounts
          revenueUSD: shopifyData.revenue / 100, // Original USD amount
          revenue: metrics.revenue / 100, // Converted EUR amount
          exchangeRate: exchangeRate,
          adSpend: metrics.adSpend / 100,
          cogs: metrics.cogs / 100,
          shipping: metrics.shipping / 100,
          processingFees: metrics.processingFees / 100,
          grossProfit: metrics.grossProfit / 100,
          operationalExpenses: metrics.operationalExpenses / 100,
          disputes: metrics.disputes / 100,
          netProfit: metrics.netProfit / 100,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
