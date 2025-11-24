import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as utils from "./utils";

export const appRouter = router({
  system: systemRouter,
  
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
        sku: z.string().min(1),
        cogs: z.number().min(0),
        shippingCost: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getProductBySku(input.sku);
        if (existing) {
          // Update existing
          await db.updateProduct(input.sku, {
            cogs: Math.round(input.cogs * 100),
            shippingCost: Math.round(input.shippingCost * 100),
          });
          return { success: true, message: "Product updated" };
        } else {
          // Create new
          await db.createProduct({
            sku: input.sku,
            cogs: Math.round(input.cogs * 100),
            shippingCost: Math.round(input.shippingCost * 100),
          });
          return { success: true, message: "Product created" };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ sku: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteProduct(input.sku);
        return { success: true };
      }),

    importCSV: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input }) => {
        const rows = utils.parseCSV(input.csvContent);
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
          try {
            const sku = row.sku || row.SKU;
            const cogs = parseFloat(row.cogs || row.COGS || '0');
            const shippingCost = parseFloat(row.shipping_cost || row.shipping || '0');

            if (!sku) {
              failed++;
              errors.push("Missing SKU");
              continue;
            }

            await db.createProduct({
              sku,
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
      .mutation(async () => {
        const { getShopifyProducts } = await import("./shopify-products");
        const shopifyProducts = await getShopifyProducts();
        
        // Get existing products to avoid duplicates
        const existingProducts = await db.getAllProducts();
        const existingSkus = new Set(existingProducts.map(p => p.sku));
        
        let imported = 0;
        let skipped = 0;
        
        for (const product of shopifyProducts) {
          if (!existingSkus.has(product.sku)) {
            // Create with default COGS (0) - user will need to set these
            await db.createProduct({
              sku: product.sku,
              cogs: 0,
              shippingCost: 0,
            });
            imported++;
          } else {
            skipped++;
          }
        }
        
        return { imported, skipped, total: shopifyProducts.length };
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
      .mutation(async ({ input }) => {
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

        // Fetch real data from APIs
        const { getFacebookAdSpend } = await import("./facebook-ads");
        const { getShopifyOrders } = await import("./shopify");
        
        const [adSpend, shopifyData] = await Promise.all([
          getFacebookAdSpend(startDate, endDate),
          getShopifyOrders(startDate, endDate),
        ]);

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

        const metrics = utils.calculateMetrics({
          revenue: shopifyData.revenue,
          adSpend: adSpend,
          cogs: shopifyData.cogs,
          shipping: shopifyData.shipping,
          operationalExpenses: totalExpenses,
          disputes: totalDisputes,
          orders: shopifyData.orderCount,
        });

        return {
          ...metrics,
          // Convert to euros for display
          revenue: metrics.revenue / 100,
          adSpend: metrics.adSpend / 100,
          cogs: metrics.cogs / 100,
          shipping: metrics.shipping / 100,
          grossProfit: metrics.grossProfit / 100,
          operationalExpenses: metrics.operationalExpenses / 100,
          disputes: metrics.disputes / 100,
          netProfit: metrics.netProfit / 100,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
