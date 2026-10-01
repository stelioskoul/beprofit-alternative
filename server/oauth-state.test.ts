import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

const original = process.env.JWT_SECRET;
beforeEach(() => {
  process.env.JWT_SECRET = "test-only-oauth-secret-of-at-least-32-characters";
});
afterEach(() => {
  if (original === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = original;
});

describe("OAuth state", () => {
  it("binds the provider, user, store and expiration", async () => {
    const state = await createOAuthState("shopify", 13, 8);
    expect(await verifyOAuthState(state, "shopify")).toEqual({ storeId: 13, userId: 8 });
    await expect(verifyOAuthState(state, "facebook")).rejects.toThrow();
  });
  it("rejects tampering and invalid store ids", async () => {
    await expect(createOAuthState("facebook", -1, 8)).rejects.toThrow();
    const state = await createOAuthState("facebook", 9, 2);
    await expect(verifyOAuthState(state.slice(0, -2) + "xx", "facebook")).rejects.toThrow();
  });
});
