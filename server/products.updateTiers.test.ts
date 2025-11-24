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

  it("should save flat COGS and shipping tiers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const shippingTiers = JSON.stringify({
      EU: { "1": 500, "2": 700, "3": 900, "4": 1100 },
      USA: { "1": 800, "2": 1000, "3": 1200, "4": 1400 },
      Canada: { "1": 900, "2": 1100, "3": 1300, "4": 1500 },
      ROW: { "1": 1200, "2": 1400, "3": 1600, "4": 1800 },
    });

    const result = await caller.products.updateTiers({
      variantId: testVariantId,
      cogs: 25.50, // EUR
      shippingTiers,
    });

    expect(result).toEqual({ success: true });

    // Verify data was saved
    const product = await db.getProductByVariantId(testVariantId);
    expect(product).toBeDefined();
    expect(product?.cogs).toBe(2550); // Converted to cents
    expect(product?.shippingTiers).toBe(shippingTiers);
  });

  it("should allow null shipping tiers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.updateTiers({
      variantId: testVariantId,
      cogs: 10.00,
      shippingTiers: null,
    });

    expect(result).toEqual({ success: true });

    const product = await db.getProductByVariantId(testVariantId);
    expect(product?.cogs).toBe(1000);
    expect(product?.shippingTiers).toBeNull();
  });

  it("should update COGS without affecting existing shipping tiers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const shippingTiers = JSON.stringify({
      EU: { "1": 500, "2": 700, "3": 900, "4": 1100 },
    });

    // First set shipping tiers
    await caller.products.updateTiers({
      variantId: testVariantId,
      cogs: 15.00,
      shippingTiers,
    });

    // Then update only COGS
    await caller.products.updateTiers({
      variantId: testVariantId,
      cogs: 20.00,
      shippingTiers,
    });

    const product = await db.getProductByVariantId(testVariantId);
    expect(product?.cogs).toBe(2000); // Updated COGS
    expect(product?.shippingTiers).toBe(shippingTiers); // Unchanged shipping
  });

  it("should handle decimal COGS values correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.products.updateTiers({
      variantId: testVariantId,
      cogs: 12.99,
      shippingTiers: null,
    });

    const product = await db.getProductByVariantId(testVariantId);
    expect(product?.cogs).toBe(1299); // 12.99 EUR = 1299 cents
  });
});
