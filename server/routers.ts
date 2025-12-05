import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getShopifyAuthUrl, exchangeShopifyCode } from "./shopify-oauth";
import { getFacebookAuthUrl, exchangeFacebookCode, exchangeForLongLivedToken, getFacebookAdAccounts } from "./facebook-oauth";
import { fetchShopifyOrders, fetchShopifyDisputes, fetchShopifyBalanceTransactions } from "./shopify-data";
import { fetchFacebookAdSpend } from "./facebook-data";
import { processOrders, calculateProcessingFees, calculateOperationalExpensesForPeriod } from "./profit-calculator";
import { getEurUsdRate, getCachedRate } from "./exchange-rate";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  exchangeRate: router({
    getCurrent: publicProcedure.query(async () => {
      const rate = await getEurUsdRate();
      const cached = getCachedRate();
      return {
        rate,
        expiresAt: cached?.expiresAt || null,
      };
    }),
  }),

  stores: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStoresByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.id);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }
        return store;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          platform: z.string().default("shopify"),
          currency: z.string().default("USD"),
          timezone: z.string().default("America/New_York"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Calculate timezoneOffset from timezone for backward compatibility
        const timezoneOffsets: Record<string, number> = {
          "America/New_York": -300,    // EST: UTC-5
          "America/Los_Angeles": -480, // PST: UTC-8
          "Europe/Athens": 120,        // EET: UTC+2
        };
        const timezoneOffset = timezoneOffsets[input.timezone] || -300;

        await db.createStore({
          userId: ctx.user.id,
          ...input,
          timezoneOffset,
        });

        const stores = await db.getStoresByUserId(ctx.user.id);
        const newStore = stores[stores.length - 1];
        if (newStore) {
          await db.upsertProcessingFeesConfig({
            storeId: newStore.id,
            percentFee: "0.0280",
            fixedFee: "0.29",
            currency: "USD",
          });
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.deleteStore(input.storeId);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          timezoneOffset: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.id);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.updateStore(input.id, {
          name: input.name,
          timezoneOffset: input.timezoneOffset,
        });

        return { success: true };
      }),
  }),

  shopify: router({
    getAuthUrl: protectedProcedure
      .input(z.object({ storeId: z.number(), shop: z.string() }))
      .mutation(({ input }) => {
        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/oauth/shopify/callback`;
        const state = JSON.stringify({ storeId: input.storeId });
        const authUrl = getShopifyAuthUrl(input.shop, redirectUri, state);
        return { authUrl };
      }),

    connectManual: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          shopDomain: z.string(),
          accessToken: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Verify token works by making a test API call
        const testUrl = `https://${input.shopDomain}/admin/api/2025-10/shop.json`;
        const response = await fetch(testUrl, {
          headers: {
            "X-Shopify-Access-Token": input.accessToken,
          },
        });

        if (!response.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Shopify credentials or store domain",
          });
        }

        await db.upsertShopifyConnection({
          storeId: input.storeId,
          shopDomain: input.shopDomain,
          accessToken: input.accessToken,
          scopes: "read_orders,read_products,read_customers,read_shopify_payments_disputes",
          apiVersion: "2025-10",
        });

        return { success: true };
      }),

    handleCallback: publicProcedure
      .input(
        z.object({
          shop: z.string(),
          code: z.string(),
          state: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { storeId } = JSON.parse(input.state);
        const tokenData = await exchangeShopifyCode(input.shop, input.code);

        await db.upsertShopifyConnection({
          storeId,
          shopDomain: input.shop,
          accessToken: tokenData.access_token,
          scopes: tokenData.scope,
          apiVersion: "2025-10",
        });

        return { success: true };
      }),

    getConnection: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        const connection = await db.getShopifyConnectionByStoreId(input.storeId);
        if (!connection) return null;

        return {
          id: connection.id,
          shopDomain: connection.shopDomain,
          connectedAt: connection.connectedAt,
          lastSyncAt: connection.lastSyncAt,
        };
      }),

    disconnect: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.deleteShopifyConnection(input.storeId);
        return { success: true };
      }),
  }),
  facebook: router({
    getAuthUrl: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(({ input }) => {
        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/oauth/facebook/callback`;
        const state = JSON.stringify({ storeId: input.storeId });
        const authUrl = getFacebookAuthUrl(redirectUri, state);
        return { authUrl };
      }),
    
    connectManual: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          accessToken: z.string(),
          adAccountId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Verify token works by fetching ad account info
        const adAccounts = await getFacebookAdAccounts(input.accessToken);
        const account = adAccounts.find((acc: any) => acc.id === input.adAccountId);
        
        if (!account) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ad account not found or token invalid",
          });
        }

        // Save connection with a far-future expiry (manual tokens don't expire easily)
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

        await db.upsertFacebookConnection({
          storeId: input.storeId,
          adAccountId: input.adAccountId,
          accessToken: input.accessToken,
          tokenExpiresAt: expiresAt,
          apiVersion: "v21.0",
          timezoneOffset: -300,
        });

        return { success: true };
      }),
    getConnections: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        const connections = await db.getFacebookConnectionsByStoreId(input.storeId);

        return connections.map((conn) => ({
          id: conn.id,
          adAccountId: conn.adAccountId,
          connectedAt: conn.connectedAt,
          lastSyncAt: conn.lastSyncAt,
          tokenExpiresAt: conn.tokenExpiresAt,
        }));
      }),

    disconnect: protectedProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFacebookConnection(input.connectionId);
        return { success: true };
      }),
  }),

  metrics: router({
    getProfit: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          fromDate: z.string(),
          toDate: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        // Get live exchange rate
        const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();

        const shopifyConn = await db.getShopifyConnectionByStoreId(input.storeId);
        const facebookConns = await db.getFacebookConnectionsByStoreId(input.storeId);

        // Initialize with zero values
        let orders: any[] = [];
        let disputes = { totalAmount: 0, count: 0 };
        let processed: any = { revenue: 0, totalCogs: 0, totalShipping: 0, ordersCount: 0, processedOrders: [] };
        let processingFees = 0;
        let totalDisputes = 0; // Initialize disputes from balance transactions

        // Fetch Shopify data if connected
        if (shopifyConn) {
          orders = await fetchShopifyOrders(
            shopifyConn.shopDomain,
            shopifyConn.accessToken,
            { fromDate: input.fromDate, toDate: input.toDate },
            store.timezoneOffset || -300,
            shopifyConn.apiVersion || "2025-10"
          );

          disputes = await fetchShopifyDisputes(
            shopifyConn.shopDomain,
            shopifyConn.accessToken,
            { fromDate: input.fromDate, toDate: input.toDate },
            store.timezoneOffset || -300,
            shopifyConn.apiVersion || "2025-10"
          );

          const cogsConfigList = await db.getCogsConfigByStoreId(input.storeId);
          const shippingConfigList = await db.getShippingConfigByStoreId(input.storeId);

          const cogsMap: Record<string, number> = {};
          for (const config of cogsConfigList) {
            const val = parseFloat(config.cogsValue);
            if (!isNaN(val)) {
              cogsMap[config.variantId] = val;
            }
          }
          console.log(`[COGS] Loaded ${Object.keys(cogsMap).length} COGS configurations:`, Object.keys(cogsMap).slice(0, 5));

          const shippingMap: Record<string, any> = {};
          for (const config of shippingConfigList) {
            try {
              shippingMap[config.variantId] = JSON.parse(config.configJson || "{}");
            } catch (e) {
              console.error("Failed to parse shipping config:", e);
            }
          }
          console.log(`[Shipping] Loaded ${Object.keys(shippingMap).length} shipping configurations:`, Object.keys(shippingMap).slice(0, 5));

          // Fetch actual processing fees and disputes from Shopify balance transactions
          // NOTE: This may take 10-30 seconds depending on transaction volume
          let orderFees: Map<number, number> | undefined;
          try {
            // Get exchange rate for EUR to USD conversion (balance transactions return EUR)
            const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();
            const balanceData = await fetchShopifyBalanceTransactions(
              shopifyConn.shopDomain,
              shopifyConn.accessToken,
              { fromDate: input.fromDate, toDate: input.toDate },
              shopifyConn.apiVersion || "2025-10",
              EXCHANGE_RATE_EUR_USD
            );
            orderFees = balanceData.orderFees;
            totalDisputes = balanceData.totalDisputes;
            console.log(`[Balance Transactions] Fetched fees for ${orderFees.size} orders, disputes: $${totalDisputes.toFixed(2)}`);
          } catch (error) {
            console.error("Failed to fetch balance transactions, using calculated fees:", error);
          }

          // Get exchange rate for shipping cost conversion
          const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();
          
          // Debug: Log first order's variant IDs
          if (orders.length > 0 && orders[0].line_items?.length > 0) {
            const firstOrderVariants = orders[0].line_items.map(item => `${item.variant_id} (${typeof item.variant_id})`);
            console.log(`[Orders] First order variant IDs:`, firstOrderVariants);
          }
          
          processed = processOrders(orders, cogsMap, shippingMap, EXCHANGE_RATE_EUR_USD, orderFees);

          const processingFeesConfig = await db.getProcessingFeesConfigByStoreId(input.storeId);
          const percentFee = processingFeesConfig ? parseFloat(processingFeesConfig.percentFee || "0.028") : 0.028;
          const fixedFee = processingFeesConfig ? parseFloat(processingFeesConfig.fixedFee || "0.29") : 0.29;
          processingFees = calculateProcessingFees(processed.revenue, processed.ordersCount, percentFee, fixedFee);
        }

        // Fetch Facebook ad spend if connected
        let totalAdSpend = 0;
        for (const fbConn of facebookConns) {
          const { spend, currency } = await fetchFacebookAdSpend(
            fbConn.adAccountId,
            fbConn.accessToken,
            { fromDate: input.fromDate, toDate: input.toDate },
            fbConn.apiVersion || "v21.0"
          );

          if (currency === "USD") {
            totalAdSpend += spend / EXCHANGE_RATE_EUR_USD;
          } else {
            totalAdSpend += spend;
          }
        }

        const expenses = await db.getOperationalExpensesByStoreId(input.storeId);
        const fromDateObj = new Date(input.fromDate);
        const toDateObj = new Date(input.toDate);
        const operationalExpensesTotal = calculateOperationalExpensesForPeriod(
          expenses.map((e) => ({
            type: e.type,
            amount: parseFloat(e.amount),
            date: e.date,
            startDate: e.startDate,
            endDate: e.endDate,
          })),
          fromDateObj,
          toDateObj
        );

        // Keep values in USD
        const revenueUSD = processed.revenue;
        const cogsUSD = processed.totalCogs;
        const shippingUSD = processed.totalShipping;
        const processingFeesUSD = processingFees;
        const disputesUSD = totalDisputes; // From balance transactions
        
        // Convert ad spend to USD if it was in EUR
        const adSpendUSD = totalAdSpend * EXCHANGE_RATE_EUR_USD;
        
        // Convert operational expenses to USD
        const operationalExpensesUSD = operationalExpensesTotal * EXCHANGE_RATE_EUR_USD;

        const netProfitUSD =
          revenueUSD -
          cogsUSD -
          shippingUSD -
          processingFeesUSD -
          adSpendUSD -
          disputesUSD -
          operationalExpensesUSD;

        // Calculate average order profit margin (average of individual order margins)
        let averageOrderProfitMargin = 0;
        if (processed.processedOrders && processed.processedOrders.length > 0) {
          const orderMargins = processed.processedOrders.map(order => {
            const orderRevenue = order.total;
            const orderProfit = order.profit;
            return orderRevenue > 0 ? (orderProfit / orderRevenue) * 100 : 0;
          });
          averageOrderProfitMargin = orderMargins.reduce((sum, margin) => sum + margin, 0) / orderMargins.length;
        }

        return {
          revenue: revenueUSD,
          orders: processed.ordersCount,
          cogs: cogsUSD,
          shipping: shippingUSD,
          processingFees: processingFeesUSD,
          adSpend: adSpendUSD,
          disputes: disputesUSD,
          operationalExpenses: operationalExpensesUSD,
          netProfit: netProfitUSD,
          processedOrders: processed.processedOrders,
          averageOrderProfitMargin: averageOrderProfitMargin,
        };
      }),
  }),

  expenses: router({
    list: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        return await db.getOperationalExpensesByStoreId(input.storeId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          title: z.string(),
          amount: z.string(),
          currency: z.enum(["USD", "EUR"]),
          type: z.enum(["one_time", "monthly", "yearly"]),
          date: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.createOperationalExpense({
          storeId: input.storeId,
          type: input.type,
          title: input.title,
          amount: input.amount,
          currency: input.currency,
          date: input.date ? new Date(input.date) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          isActive: input.isActive,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOperationalExpense(input.id);
        return { success: true };
      }),
  }),

  products: router({
    list: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        const shopifyConn = await db.getShopifyConnectionByStoreId(input.storeId);
        if (!shopifyConn) {
          return [];
        }

        // Fetch ALL products from Shopify with pagination
        const allProducts: any[] = [];
        let nextPageInfo: string | null = null;
        let pageCount = 0;
        const MAX_PAGES = 20; // Fetch up to 5000 products (250 per page)

        while (pageCount < MAX_PAGES) {
          pageCount++;
          const url = new URL(`https://${shopifyConn.shopDomain}/admin/api/${shopifyConn.apiVersion || "2025-10"}/products.json`);
          
          if (nextPageInfo) {
            url.searchParams.set("page_info", nextPageInfo);
            url.searchParams.set("limit", "250");
          } else {
            url.searchParams.set("limit", "250");
          }

          const response = await fetch(url.toString(), {
            headers: {
              "X-Shopify-Access-Token": shopifyConn.accessToken,
            },
          });

          if (!response.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch products from Shopify",
            });
          }

          const data = await response.json();
          const products = data.products || [];
          allProducts.push(...products);

          // Check for next page
          const linkHeader = response.headers.get("link");
          if (linkHeader && linkHeader.includes('rel="next"')) {
            const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>; rel="next"/);
            if (nextMatch) {
              nextPageInfo = nextMatch[1];
            } else {
              break;
            }
          } else {
            break;
          }
        }

        console.log(`[Products] Fetched ${allProducts.length} products from Shopify`);
        return allProducts;
      }),
  }),

  orders: router({
    listWithProfit: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        const shopifyConn = await db.getShopifyConnectionByStoreId(input.storeId);
        if (!shopifyConn) {
          return [];
        }

        const orders = await fetchShopifyOrders(
          shopifyConn.shopDomain,
          shopifyConn.accessToken,
          { fromDate: input.startDate, toDate: input.endDate },
          store.timezoneOffset || -300,
          shopifyConn.apiVersion || "2025-10"
        );

        const cogsConfigList = await db.getCogsConfigByStoreId(input.storeId);
        const shippingConfigList = await db.getShippingConfigByStoreId(input.storeId);
        const processingFeesConfig = await db.getProcessingFeesConfigByStoreId(input.storeId);

        const cogsMap: Record<string, number> = {};
        for (const config of cogsConfigList) {
          const val = parseFloat(config.cogsValue);
          if (!isNaN(val)) {
            cogsMap[config.variantId] = val;
          }
        }

        const shippingMap: Record<string, any> = {};
        for (const config of shippingConfigList) {
          try {
            shippingMap[config.variantId] = JSON.parse(config.configJson);
          } catch {}
        }

        // Fetch actual processing fees and disputes from Shopify balance transactions
        // NOTE: This may take 10-30 seconds depending on transaction volume
        let orderFees: Map<number, number> | undefined;
        try {
          // Get exchange rate for EUR to USD conversion (balance transactions return EUR)
          const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();
          const balanceData = await fetchShopifyBalanceTransactions(
            shopifyConn.shopDomain,
            shopifyConn.accessToken,
            { fromDate: input.startDate, toDate: input.endDate },
            shopifyConn.apiVersion || "2025-10",
            EXCHANGE_RATE_EUR_USD
          );
          orderFees = balanceData.orderFees;
          // Note: totalDisputes is not used in orders list, only in dashboard
          console.log(`[Balance Transactions] Fetched fees for ${orderFees.size} orders`);
        } catch (error) {
          console.error("Failed to fetch balance transactions, using calculated fees:", error);
        }

        // Get exchange rate for shipping cost conversion and currency conversion
        const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();
        const processed = processOrders(orders, cogsMap, shippingMap, EXCHANGE_RATE_EUR_USD, orderFees);
        const processingFees = calculateProcessingFees(
          processed.revenue,
          processed.ordersCount,
          parseFloat(processingFeesConfig?.percentFee || "0.028"),
          parseFloat(processingFeesConfig?.fixedFee || "0.29")
        );

        // Calculate per-order profit in USD
        const ordersWithProfit = processed.processedOrders.map((order: any) => {
          // Keep values in USD
          const orderTotal = order.total; // total_price from Shopify already includes shipping, discounts, and tips
          const orderShippingRevenue = order.shippingRevenue || 0;
          const orderTip = order.tip || 0;
          const orderCogs = order.cogs;
          const orderShipping = order.shippingCost;
          const orderProcessingFee = order.processingFees || ((order.total * parseFloat(processingFeesConfig?.percentFee || "0.028")) + parseFloat(processingFeesConfig?.fixedFee || "0.29"));
          // Profit = Total Revenue - COGS - Shipping Cost - Processing Fees
          // Note: orderTotal already includes everything customer paid (products + shipping + tip - discounts)
          const orderProfit = orderTotal - orderCogs - orderShipping - orderProcessingFee;

          return {
            id: order.id,
            orderNumber: order.orderNumber || order.id,
            createdAt: order.createdAt,
            country: order.country,
            shippingType: order.shippingType,
            discount: order.discount || 0,
            tip: orderTip,
            shippingRevenue: orderShippingRevenue,
            totalRevenue: orderTotal,
            totalCogs: orderCogs,
            totalShipping: orderShipping,
            totalProcessingFees: orderProcessingFee,
            profit: orderProfit,
            lineItems: (order.items || []).map((item: any) => {
              // Keep values in USD
              const itemPrice = item.price;
              const itemCogs = item.cogs || 0;
              const itemShipping = item.shippingCost || 0;
              // Note: Processing fees are now tracked at order level only (from Shopify balance transactions)
              // Item profit = revenue - cogs - shipping (fees are deducted at order level)
              
              return {
                name: item.name,
                quantity: item.quantity,
                price: itemPrice,
                cogs: itemCogs,
                shipping: itemShipping,
                profit: (itemPrice * item.quantity) - itemCogs - itemShipping,
              };
            }),
          };
        });

        return ordersWithProfit;
      }),
  }),

  config: router({
    getCogs: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        return await db.getCogsConfigByStoreId(input.storeId);
      }),

    setCogs: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
          cogsValue: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.upsertCogsConfig({
          storeId: input.storeId,
          variantId: input.variantId,
          productTitle: null,
          cogsValue: input.cogsValue,
          currency: "EUR",
        });

        return { success: true };
      }),

    setShipping: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
          configJson: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.upsertShippingConfig({
          storeId: input.storeId,
          variantId: input.variantId,
          productTitle: null,
          configJson: input.configJson,
        });

        return { success: true };
      }),

    upsertCogs: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
          productTitle: z.string().optional(),
          cogsValue: z.number(),
          currency: z.string().default("EUR"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.upsertCogsConfig({
          storeId: input.storeId,
          variantId: input.variantId,
          productTitle: input.productTitle || null,
          cogsValue: input.cogsValue.toString(),
          currency: input.currency,
        });

        return { success: true };
      }),

    getShipping: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        return await db.getShippingConfigByStoreId(input.storeId);
      }),

    upsertShipping: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
          productTitle: z.string().optional(),
          configJson: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.upsertShippingConfig({
          storeId: input.storeId,
          variantId: input.variantId,
          productTitle: input.productTitle || null,
          configJson: input.configJson,
        });

        return { success: true };
      }),
  }),

  shippingProfiles: router({
    list: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        return await db.getShippingProfilesByStoreId(input.storeId);
      }),

    getById: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getShippingProfileById(input.profileId);
        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found",
          });
        }

        const store = await db.getStoreById(profile.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Access denied",
          });
        }

        return profile;
      }),

    create: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          configJson: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.createShippingProfile({
          storeId: input.storeId,
          name: input.name,
          description: input.description || null,
          configJson: input.configJson,
        });

        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          profileId: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          configJson: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getShippingProfileById(input.profileId);
        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found",
          });
        }

        const store = await db.getStoreById(profile.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Access denied",
          });
        }

        const updates: Partial<typeof profile> = {};
        if (input.name) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.configJson) updates.configJson = input.configJson;

        await db.updateShippingProfile(input.profileId, updates);

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getShippingProfileById(input.profileId);
        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found",
          });
        }

        const store = await db.getStoreById(profile.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Access denied",
          });
        }

        await db.deleteShippingProfile(input.profileId);

        return { success: true };
      }),

    assignToProduct: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
          profileId: z.number(),
          productTitle: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.assignShippingProfile({
          storeId: input.storeId,
          variantId: input.variantId,
          profileId: input.profileId,
          productTitle: input.productTitle || null,
        });

        return { success: true };
      }),

    getProductAssignments: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        return await db.getProductShippingProfilesByStoreId(input.storeId);
      }),

    removeProductAssignment: protectedProcedure
      .input(
        z.object({
          storeId: z.number(),
          variantId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found or access denied",
          });
        }

        await db.removeProductShippingProfile(input.storeId, input.variantId);

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
