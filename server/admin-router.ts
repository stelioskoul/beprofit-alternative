import { adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, sql, desc, count } from "drizzle-orm";
import { getDb } from "./db";
import { 
  users, 
  stores, 
  shopifyConnections, 
  facebookConnections,
  cogsConfig,
  shippingConfig,
  operationalExpenses 
} from "../drizzle/schema";

export const adminRouter = router({
  // ==================== USER MANAGEMENT ====================
  
  // Get all users with their store counts
  getUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allUsers = await db.select({
      id: users.id,
      openId: users.openId,
      email: users.email,
      name: users.name,
      loginMethod: users.loginMethod,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).orderBy(desc(users.createdAt));

    // Get store counts for each user
    const storeCounts = await db.select({
      userId: stores.userId,
      count: count(),
    }).from(stores).groupBy(stores.userId);

    const storeCountMap = new Map(storeCounts.map(s => [s.userId, s.count]));

    return allUsers.map(user => ({
      ...user,
      storeCount: storeCountMap.get(user.id) || 0,
    }));
  }),

  // Get single user details
  getUserDetails: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [user] = await db.select().from(users).where(eq(users.id, input.userId));
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const userStores = await db.select().from(stores).where(eq(stores.userId, input.userId));

      return { user, stores: userStores };
    }),

  // Delete user (and all their data)
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Prevent self-deletion
      if (ctx.user?.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" });
      }

      // Get user's stores first
      const userStores = await db.select({ id: stores.id }).from(stores).where(eq(stores.userId, input.userId));
      const storeIds = userStores.map(s => s.id);

      // Delete related data for each store
      for (const storeId of storeIds) {
        await db.delete(shopifyConnections).where(eq(shopifyConnections.storeId, storeId));
        await db.delete(facebookConnections).where(eq(facebookConnections.storeId, storeId));
        await db.delete(cogsConfig).where(eq(cogsConfig.storeId, storeId));
        await db.delete(shippingConfig).where(eq(shippingConfig.storeId, storeId));
        await db.delete(operationalExpenses).where(eq(operationalExpenses.storeId, storeId));
      }

      // Delete stores
      await db.delete(stores).where(eq(stores.userId, input.userId));

      // Delete user
      await db.delete(users).where(eq(users.id, input.userId));

      return { success: true };
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(z.object({ 
      userId: z.number(),
      role: z.enum(["user", "admin"])
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Prevent changing own role
      if (ctx.user?.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
      }

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ==================== STORE OVERVIEW ====================

  // Get all stores with connection status
  getAllStores: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allStores = await db.select({
      id: stores.id,
      userId: stores.userId,
      name: stores.name,
      platform: stores.platform,
      currency: stores.currency,
      createdAt: stores.createdAt,
    }).from(stores).orderBy(desc(stores.createdAt));

    // Get user info for each store
    const userIds = Array.from(new Set(allStores.map(s => s.userId)));
    const storeUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
    }).from(users);
    const userMap = new Map(storeUsers.map(u => [u.id, u]));

    // Get Shopify connections
    const shopifyConns = await db.select({
      storeId: shopifyConnections.storeId,
      shopDomain: shopifyConnections.shopDomain,
      lastSyncAt: shopifyConnections.lastSyncAt,
    }).from(shopifyConnections);
    const shopifyMap = new Map(shopifyConns.map(c => [c.storeId, c]));

    // Get Facebook connections count per store
    const fbConns = await db.select({
      storeId: facebookConnections.storeId,
      count: count(),
    }).from(facebookConnections).groupBy(facebookConnections.storeId);
    const fbMap = new Map(fbConns.map(c => [c.storeId, c.count]));

    return allStores.map(store => ({
      ...store,
      user: userMap.get(store.userId) || null,
      shopifyConnected: shopifyMap.has(store.id),
      shopifyDomain: shopifyMap.get(store.id)?.shopDomain || null,
      shopifyLastSync: shopifyMap.get(store.id)?.lastSyncAt || null,
      facebookAccountsCount: fbMap.get(store.id) || 0,
    }));
  }),

  // ==================== SYSTEM METRICS ====================

  // Get system-wide statistics
  getSystemMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Total users
    const [userCount] = await db.select({ count: count() }).from(users);
    
    // Total stores
    const [storeCount] = await db.select({ count: count() }).from(stores);
    
    // Shopify connections
    const [shopifyCount] = await db.select({ count: count() }).from(shopifyConnections);
    
    // Facebook connections
    const [facebookCount] = await db.select({ count: count() }).from(facebookConnections);

    // Users by role
    const usersByRole = await db.select({
      role: users.role,
      count: count(),
    }).from(users).groupBy(users.role);

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [recentSignups] = await db.select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${sevenDaysAgo}`);

    // Active users (logged in last 7 days)
    const [activeUsers] = await db.select({ count: count() })
      .from(users)
      .where(sql`${users.lastSignedIn} >= ${sevenDaysAgo}`);

    return {
      totalUsers: userCount.count,
      totalStores: storeCount.count,
      shopifyConnections: shopifyCount.count,
      facebookConnections: facebookCount.count,
      usersByRole: Object.fromEntries(usersByRole.map(r => [r.role, r.count])),
      recentSignups: recentSignups.count,
      activeUsers: activeUsers.count,
    };
  }),

  // ==================== CONFIGURATION MANAGEMENT ====================

  // Get current exchange rate
  getExchangeRate: adminProcedure.query(async () => {
    const rate = parseFloat(process.env.EXCHANGE_RATE_EUR_USD || "1.1588");
    return { rate, source: "environment" };
  }),

  // Note: Exchange rate is set via environment variable EXCHANGE_RATE_EUR_USD
  // To update it, use webdev_edit_secrets tool or Settings > Secrets in Manus UI

  // Get default processing fees (these are hardcoded defaults, can be overridden per store)
  getDefaultProcessingFees: adminProcedure.query(async () => {
    return {
      percentFee: 0.028, // 2.8%
      fixedFee: 0.29, // $0.29
      description: "Default Stripe/PayPal processing fees. Can be overridden per store in Settings."
    };
  }),
});
