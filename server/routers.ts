import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getShopifyAuthUrl, exchangeShopifyCode } from "./shopify-oauth";
import { getFacebookAuthUrl, exchangeFacebookCode, exchangeForLongLivedToken, getFacebookAdAccounts } from "./facebook-oauth";
import { fetchShopifyOrders, fetchShopifyDisputes } from "./shopify-data";
import { fetchFacebookAdSpend } from "./facebook-data";
import { processOrders, calculateProcessingFees, calculateOperationalExpensesForPeriod } from "./profit-calculator";

const EXCHANGE_RATE_EUR_USD = parseFloat(process.env.EXCHANGE_RATE_EUR_USD || "1.08");

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
          timezoneOffset: z.number().default(-300),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createStore({
          userId: ctx.user.id,
          ...input,
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

        const shopifyConn = await db.getShopifyConnectionByStoreId(input.storeId);
        const facebookConns = await db.getFacebookConnectionsByStoreId(input.storeId);

        // Initialize with zero values
        let orders: any[] = [];
        let disputes = { totalAmount: 0, count: 0 };
        let processed: any = { revenue: 0, totalCogs: 0, totalShipping: 0, ordersCount: 0, processedOrders: [] };
        let processingFees = 0;

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

          const shippingMap: Record<string, any> = {};
          for (const config of shippingConfigList) {
            try {
              shippingMap[config.variantId] = JSON.parse(config.configJson || "{}");
            } catch (e) {
              console.error("Failed to parse shipping config:", e);
            }
          }

          processed = processOrders(orders, cogsMap, shippingMap);

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

        const revenueEUR = processed.revenue / EXCHANGE_RATE_EUR_USD;
        const cogsEUR = processed.totalCogs / EXCHANGE_RATE_EUR_USD;
        const shippingEUR = processed.totalShipping / EXCHANGE_RATE_EUR_USD;
        const processingFeesEUR = processingFees / EXCHANGE_RATE_EUR_USD;
        const disputesEUR = disputes.totalAmount / EXCHANGE_RATE_EUR_USD;
        const operationalExpensesEUR = operationalExpensesTotal / EXCHANGE_RATE_EUR_USD;

        const netProfit =
          revenueEUR -
          cogsEUR -
          shippingEUR -
          processingFeesEUR -
          totalAdSpend -
          disputesEUR -
          operationalExpensesEUR;

        return {
          revenue: revenueEUR,
          orders: processed.ordersCount,
          cogs: cogsEUR,
          shipping: shippingEUR,
          processingFees: processingFeesEUR,
          adSpend: totalAdSpend,
          disputes: disputesEUR,
          operationalExpenses: operationalExpensesEUR,
          netProfit,
          processedOrders: processed.processedOrders,
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
          name: z.string(),
          amount: z.string(),
          type: z.enum(["one-time", "monthly", "quarterly", "yearly"]),
          date: z.string(),
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

        // Map UI type to DB type
        let dbType: "one_time" | "monthly" | "yearly" = "one_time";
        if (input.type === "monthly" || input.type === "quarterly") {
          dbType = "monthly";
        } else if (input.type === "yearly") {
          dbType = "yearly";
        }

        await db.createOperationalExpense({
          storeId: input.storeId,
          type: dbType,
          title: input.name,
          amount: input.amount,
          currency: "EUR",
          date: new Date(input.date),
          startDate: input.type !== "one-time" ? new Date(input.date) : undefined,
          endDate: undefined,
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

        // Fetch products from Shopify
        const url = `https://${shopifyConn.shopDomain}/admin/api/${shopifyConn.apiVersion || "2025-10"}/products.json?limit=250`;
        const response = await fetch(url, {
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
        return data.products || [];
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

        const processed = processOrders(orders, cogsMap, shippingMap);
        const processingFees = calculateProcessingFees(
          processed.revenue,
          processed.ordersCount,
          parseFloat(processingFeesConfig?.percentFee || "0.028"),
          parseFloat(processingFeesConfig?.fixedFee || "0.29")
        );

        // Calculate per-order profit
        const ordersWithProfit = processed.processedOrders.map((order: any) => {
          const orderTotal = order.total;
          const orderCogs = order.cogs;
          const orderShipping = order.shippingCost;
          const orderProcessingFee = (orderTotal * parseFloat(processingFeesConfig?.percentFee || "0.028")) + parseFloat(processingFeesConfig?.fixedFee || "0.29");
          const orderProfit = orderTotal - orderCogs - orderShipping - orderProcessingFee;

          return {
            id: order.id,
            orderNumber: order.orderNumber || order.id,
            createdAt: order.createdAt,
            totalRevenue: orderTotal,
            totalCogs: orderCogs,
            totalShipping: orderShipping,
            totalProcessingFees: orderProcessingFee,
            allocatedAdSpend: 0, // TODO: Allocate ad spend proportionally
            profit: orderProfit,
            lineItems: (order.lineItems || []).map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              cogs: item.cogs || 0,
              shipping: item.shippingCost || 0,
              processingFee: (item.price * item.quantity * parseFloat(processingFeesConfig?.percentFee || "0.028")),
              profit: (item.price * item.quantity) - (item.cogs || 0) - (item.shippingCost || 0) - (item.price * item.quantity * parseFloat(processingFeesConfig?.percentFee || "0.028")),
            })),
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
});

export type AppRouter = typeof appRouter;
