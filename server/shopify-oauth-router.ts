import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getShopifyAuthUrl, exchangeCodeForToken, registerWebhooks } from "./shopify-oauth";
import { getDb } from "./db";
import { shopifyTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const shopifyOAuthRouter = router({
  // Get the OAuth authorization URL
  getAuthUrl: protectedProcedure
    .input(z.object({
      redirectUri: z.string(),
    }))
    .query(({ input }) => {
      const authUrl = getShopifyAuthUrl(input.redirectUri);
      return { authUrl };
    }),

  // Handle OAuth callback and exchange code for token
  handleCallback: protectedProcedure
    .input(z.object({
      code: z.string(),
      redirectUri: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Exchange code for access token
        const tokenData = await exchangeCodeForToken(input.code, input.redirectUri);

        // Store token in database
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // Delete existing tokens for this user
        await db.delete(shopifyTokens).where(eq(shopifyTokens.userId, ctx.user.id));

        // Insert new token
        await db.insert(shopifyTokens).values({
          userId: ctx.user.id,
          shopDomain: process.env.SHOPIFY_SHOP_DOMAIN!,
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
        });

        // Register webhooks
        await registerWebhooks(tokenData.access_token);

        return { success: true };
      } catch (error) {
        console.error("[Shopify OAuth] Error:", error);
        throw new Error("Failed to complete OAuth flow");
      }
    }),

  // Check if user has connected Shopify
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { connected: false };
    }

    const tokens = await db
      .select()
      .from(shopifyTokens)
      .where(eq(shopifyTokens.userId, ctx.user.id))
      .limit(1);

    return {
      connected: tokens.length > 0,
      shopDomain: tokens[0]?.shopDomain,
    };
  }),

  // Disconnect Shopify
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.delete(shopifyTokens).where(eq(shopifyTokens.userId, ctx.user.id));

    return { success: true };
  }),
});
