import cron from "node-cron";
import * as cache from "./cache";
import * as db from "./db";

/**
 * Initialize cron jobs for cache management
 */
export function initScheduler() {
  console.log("[Scheduler] Initializing cron jobs...");

  // Run every hour to refresh cache for last 90 days
  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] Starting hourly cache refresh...");
    await refreshRecentCache();
  });

  // Run daily at 3 AM to clean up old cache (older than 90 days)
  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Cleaning up old cache...");
    await cache.clearOldCache();
  });

  console.log("[Scheduler] Cron jobs initialized successfully");
}

/**
 * Refresh cache for all stores for the last 90 days
 */
async function refreshRecentCache() {
  try {
    const database = await db.getDb();
    if (!database) {
      console.error("[Scheduler] Database not available");
      return;
    }

    // Get all stores
    const allStores = await db.getAllStores();
    
    console.log(`[Scheduler] Refreshing cache for ${allStores.length} stores...`);

    for (const store of allStores) {
      try {
        // Skip today - users always get fresh data for current date
        // Refresh yesterday (in case of late orders/refunds)
        const yesterday = cache.getDateRange(1);
        await refreshStoreCache(store.id, yesterday.startDate, yesterday.endDate);

        // Refresh last 7 days
        const lastWeek = cache.getDateRange(7);
        await refreshStoreCache(store.id, lastWeek.startDate, lastWeek.endDate);

        // Refresh last 30 days
        const lastMonth = cache.getDateRange(30);
        await refreshStoreCache(store.id, lastMonth.startDate, lastMonth.endDate);

        console.log(`[Scheduler] ✓ Refreshed cache for store ${store.id} (${store.name})`);
      } catch (error) {
        console.error(`[Scheduler] ✗ Failed to refresh cache for store ${store.id}:`, error);
      }
    }

    console.log("[Scheduler] Cache refresh completed");
  } catch (error) {
    console.error("[Scheduler] Cache refresh failed:", error);
  }
}

/**
 * Refresh cache for a specific store and date range
 */
async function refreshStoreCache(storeId: number, startDate: string, endDate: string) {
  const { calculateMetrics } = await import("./metrics-calculator");
  
  // Create a minimal context for the calculation
  const store = await db.getStoreById(storeId);
  if (!store) {
    console.error(`[Scheduler] Store ${storeId} not found`);
    return;
  }
  
  const ctx = { user: { id: store.userId } };
  const input = { storeId, fromDate: startDate, toDate: endDate };
  
  const metrics = await calculateMetrics(ctx, input);
  await cache.setCachedMetrics(storeId, startDate, endDate, metrics);
}

/**
 * Manually refresh cache for a specific store (triggered by user)
 */
export async function manualRefresh(storeId: number, startDate: string, endDate: string) {
  console.log(`[Scheduler] Manual refresh requested for store ${storeId}`);
  await refreshStoreCache(storeId, startDate, endDate);
}
