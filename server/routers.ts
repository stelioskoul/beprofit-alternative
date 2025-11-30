import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
      .input(z.object({ shop: z.string(), storeId: z.number() }))
      .mutation(({ input }) => {
        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/oauth/shopify/callback`;
        const state = JSON.stringify({ storeId: input.storeId });
        const authUrl = getShopifyAuthUrl(input.shop, state, redirectUri);
        return { authUrl };
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

    handleCallback: publicProcedure
      .input(
        z.object({
          code: z.string(),
          state: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { storeId } = JSON.parse(input.state);
        const redirectUri = `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/api/oauth/facebook/callback`;

        const shortToken = await exchangeFacebookCode(input.code, redirectUri);
        const longToken = await exchangeForLongLivedToken(shortToken.access_token);
        const adAccounts = await getFacebookAdAccounts(longToken.access_token);

        if (adAccounts.length > 0) {
          const account = adAccounts[0];
          const expiresAt = new Date(Date.now() + (longToken.expires_in || 5184000) * 1000);

          await db.upsertFacebookConnection({
            storeId,
            adAccountId: account.id,
            accessToken: longToken.access_token,
            tokenExpiresAt: expiresAt,
            apiVersion: "v21.0",
            timezoneOffset: -300,
          });
        }

        return { success: true, adAccounts };
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
        if (!shopifyConn) {
          throw new Error("Shopify not connected");
        }

        const facebookConns = await db.getFacebookConnectionsByStoreId(input.storeId);

        const orders = await fetchShopifyOrders(
          shopifyConn.shopDomain,
          shopifyConn.accessToken,
          { fromDate: input.fromDate, toDate: input.toDate },
          store.timezoneOffset || -300,
          shopifyConn.apiVersion || "2025-10"
        );

        const disputes = await fetchShopifyDisputes(
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

        const processed = processOrders(orders, cogsMap, shippingMap);

        const processingFeesConfig = await db.getProcessingFeesConfigByStoreId(input.storeId);
        const percentFee = processingFeesConfig ? parseFloat(processingFeesConfig.percentFee || "0.028") : 0.028;
        const fixedFee = processingFeesConfig ? parseFloat(processingFeesConfig.fixedFee || "0.29") : 0.29;
        const processingFees = calculateProcessingFees(processed.revenue, processed.ordersCount, percentFee, fixedFee);

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
          type: z.enum(["one_time", "monthly", "yearly"]),
          title: z.string(),
          amount: z.number(),
          currency: z.string().default("EUR"),
          date: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store || store.userId !== ctx.user.id) {
          throw new Error("Store not found or access denied");
        }

        await db.createOperationalExpense({
          storeId: input.storeId,
          type: input.type,
          title: input.title,
          amount: input.amount.toString(),
          currency: input.currency,
          date: input.date ? new Date(input.date) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ expenseId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOperationalExpense(input.expenseId);
        return { success: true };
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
