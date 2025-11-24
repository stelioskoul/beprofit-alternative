import { describe, expect, it } from "vitest";

describe("Shopify OAuth Credentials", () => {
  it("should have valid Shopify OAuth environment variables", () => {
    expect(process.env.SHOPIFY_CLIENT_ID).toBeDefined();
    expect(process.env.SHOPIFY_CLIENT_SECRET).toBeDefined();
    expect(process.env.SHOPIFY_SHOP_DOMAIN).toBeDefined();
    
    expect(process.env.SHOPIFY_CLIENT_ID).toMatch(/^[a-f0-9]{32}$/);
    expect(process.env.SHOPIFY_CLIENT_SECRET).toMatch(/^shpss_[a-f0-9]{32}$/);
    expect(process.env.SHOPIFY_SHOP_DOMAIN).toMatch(/\.myshopify\.com$/);
  });

  it("should construct valid Shopify OAuth URL", () => {
    const clientId = process.env.SHOPIFY_CLIENT_ID!;
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN!;
    const redirectUri = "https://example.com/auth/callback";
    const scopes = "read_orders,write_orders,read_products,write_products";
    
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    
    expect(authUrl).toContain(shopDomain);
    expect(authUrl).toContain(clientId);
    expect(authUrl).toContain("oauth/authorize");
  });
});
