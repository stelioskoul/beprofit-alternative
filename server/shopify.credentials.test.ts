import { describe, expect, it } from "vitest";

describe("optional provider configuration", () => {
  it.skipIf(!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET)(
    "has plausible Shopify app credentials when configured", () => {
      expect(process.env.SHOPIFY_CLIENT_ID!.length).toBeGreaterThan(15);
      expect(process.env.SHOPIFY_CLIENT_SECRET!.length).toBeGreaterThan(15);
    }
  );
  it.skipIf(!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET)(
    "has plausible Meta app credentials when configured", () => {
      expect(process.env.FACEBOOK_APP_ID).toMatch(/^\d+$/);
      expect(process.env.FACEBOOK_APP_SECRET!.length).toBeGreaterThan(15);
    }
  );
  it("uses a positive optional exchange-rate fallback", () => {
    const rate = Number(process.env.EXCHANGE_RATE_EUR_USD || "1.1588");
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(10);
  });
});
