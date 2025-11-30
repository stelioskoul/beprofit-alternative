import { describe, expect, it } from "vitest";

describe("Shopify Credentials", () => {
  it("should have valid Shopify client ID and secret", () => {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();
    expect(clientId).toMatch(/^[a-f0-9]{32}$/); // Shopify client IDs are 32 hex characters
    expect(clientSecret).toMatch(/^shpss_[a-f0-9]{32}$/); // Shopify secrets start with shpss_
  });

  it("should have valid Facebook app credentials", () => {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    expect(appId).toBeDefined();
    expect(appSecret).toBeDefined();
    expect(appId).toMatch(/^\d+$/); // Facebook app IDs are numeric
    expect(appSecret).toMatch(/^[a-f0-9]{32}$/); // Facebook secrets are 32 hex characters
  });

  it("should have valid exchange rate", () => {
    const rate = process.env.EXCHANGE_RATE_EUR_USD;

    expect(rate).toBeDefined();
    const rateNum = parseFloat(rate!);
    expect(rateNum).toBeGreaterThan(0);
    expect(rateNum).toBeLessThan(10); // Sanity check: rate should be reasonable
  });
});
