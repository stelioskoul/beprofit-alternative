import { describe, expect, it } from "vitest";

describe("APP_URL environment variable", () => {
  it("should be set to production URL", () => {
    const appUrl = process.env.APP_URL;
    
    expect(appUrl).toBeDefined();
    expect(appUrl).toContain("https://");
    expect(appUrl).toContain("manus.space");
    
    console.log("APP_URL is correctly set to:", appUrl);
  });

  it("should generate correct OAuth redirect URLs", () => {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    
    const shopifyRedirect = `${appUrl}/api/oauth/shopify/callback`;
    const facebookRedirect = `${appUrl}/api/oauth/facebook/callback`;
    
    expect(shopifyRedirect).toContain("manus.space");
    expect(facebookRedirect).toContain("manus.space");
    
    console.log("Shopify redirect:", shopifyRedirect);
    console.log("Facebook redirect:", facebookRedirect);
  });
});
