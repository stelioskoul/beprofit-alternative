import { describe, expect, it } from "vitest";

describe("OAuth redirect origins", () => {
  it("derives callbacks from the configured app origin", () => {
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const origin = new URL(appUrl).origin;
    expect(`${origin}/api/oauth/shopify/callback`).toBe(`${appUrl}/api/oauth/shopify/callback`);
    expect(`${origin}/api/oauth/facebook/callback`).toBe(`${appUrl}/api/oauth/facebook/callback`);
  });
});
