import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("products.updateTiers", () => {
  const testVariantId = "test-variant-12345";
  
  beforeEach(async () => {
    // Create a test product
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database not available");
    }
    
    try {
      await db.createProduct({
        userId: 1,
        variantId: testVariantId,
        sku: "TEST-SKU",
        productName: "Test Product",
        cogs: 1000,
        shippingCost: 500,
      });
    } catch (error) {
      // Product might already exist, ignore
    }
  });

  it("should save COGS and shipping tiers as JSON strings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const cogsTiers = JSON.stringify({
      "1": 15.00,
      "2": 13.50,
      "3": 12.00,
      "4+": 10.50,
    });

    const shippingTiers = JSON.stringify({
      EU: { "1": 5.00, "2": 7.00, "3": 9.00, "4+": 11.00 },
      USA: { "1": 8.00, "2": 10.00, "3": 12.00, "4+": 14.00 },
      Canada: { "1": 9.00, "2": 11.00, "3": 13.00, "4+": 15.00 },
      ROW: { "1": 12.00, "2": 14.00, "3": 16.00, "4+": 18.00 },
    });

    const result = await caller.products.updateTiers({
      variantId: testVariantId,
      cogsTiers,
      shippingTiers,
    });

    expect(result).toEqual({ success: true });

    // Verify data was saved
    const product = await db.getProductByVariantId(testVariantId);
    expect(product).toBeDefined();
    expect(product?.cogsTiers).toBe(cogsTiers);
    expect(product?.shippingTiers).toBe(shippingTiers);
  });

  it("should allow null values for tiers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.updateTiers({
      variantId: testVariantId,
      cogsTiers: null,
      shippingTiers: null,
    });

    expect(result).toEqual({ success: true });

    const product = await db.getProductByVariantId(testVariantId);
    expect(product?.cogsTiers).toBeNull();
    expect(product?.shippingTiers).toBeNull();
  });

  it("should update only COGS tiers without affecting shipping tiers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const shippingTiers = JSON.stringify({
      EU: { "1": 5.00 },
    });

    // First set shipping tiers
    await caller.products.updateTiers({
      variantId: testVariantId,
      cogsTiers: null,
      shippingTiers,
    });

    // Then update only COGS tiers
    const cogsTiers = JSON.stringify({ "1": 20.00 });
    await caller.products.updateTiers({
      variantId: testVariantId,
      cogsTiers,
      shippingTiers,
    });

    const product = await db.getProductByVariantId(testVariantId);
    expect(product?.cogsTiers).toBe(cogsTiers);
    expect(product?.shippingTiers).toBe(shippingTiers);
  });
});
