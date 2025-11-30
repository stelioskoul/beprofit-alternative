import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { exchangeShopifyCode } from "../shopify-oauth";
import { exchangeFacebookCode, exchangeForLongLivedToken, getFacebookAdAccounts } from "../facebook-oauth";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Shopify OAuth callback
  app.get("/api/oauth/shopify/callback", async (req: Request, res: Response) => {
    const shop = getQueryParam(req, "shop");
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!shop || !code || !state) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    try {
      const { storeId } = JSON.parse(state);
      const tokenData = await exchangeShopifyCode(shop, code);

      await db.upsertShopifyConnection({
        storeId,
        shopDomain: shop,
        accessToken: tokenData.access_token,
        scopes: tokenData.scope,
        apiVersion: "2025-10",
      });

      res.redirect(302, `/store/${storeId}/connections`);
    } catch (error) {
      console.error("[Shopify OAuth] Callback failed", error);
      res.status(500).json({ error: "Shopify OAuth callback failed" });
    }
  });

  // Facebook OAuth callback
  app.get("/api/oauth/facebook/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    try {
      const { storeId } = JSON.parse(state);
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/facebook/callback`;

      const shortToken = await exchangeFacebookCode(code, redirectUri);
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

      res.redirect(302, `/store/${storeId}/connections`);
    } catch (error) {
      console.error("[Facebook OAuth] Callback failed", error);
      res.status(500).json({ error: "Facebook OAuth callback failed" });
    }
  });
}
