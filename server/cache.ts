import { eq, and, gte } from "drizzle-orm";
import { cachedMetrics } from "../drizzle/schema";
import * as db from "./db";

/**
 * Get cached metrics for a store and date range
 */
export async function getCachedMetrics(storeId: number, startDate: string, endDate: string) {
  const database = await db.getDb();
  if (!database) return null;

  const cacheKey = `metrics_${startDate}_${endDate}`;
  const dateRange = `${startDate}_${endDate}`;

  const result = await database
    .select()
    .from(cachedMetrics)
    .where(
      and(
        eq(cachedMetrics.storeId, storeId),
        eq(cachedMetrics.cacheKey, cacheKey)
      )
    )
    .limit(1);

  if (result.length === 0) return null;

  const cache = result[0];
  
  // Check if cache is older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (new Date(cache.lastRefreshedAt) < oneHourAgo) {
    return null; // Cache expired
  }

  return cache.metricsData;
}

/**
 * Store calculated metrics in cache
 */
export async function setCachedMetrics(
  storeId: number,
  startDate: string,
  endDate: string,
  metricsData: any
) {
  const database = await db.getDb();
  if (!database) return;

  const cacheKey = `metrics_${startDate}_${endDate}`;
  const dateRange = `${startDate}_${endDate}`;

  // Delete existing cache for this key
  await database
    .delete(cachedMetrics)
    .where(
      and(
        eq(cachedMetrics.storeId, storeId),
        eq(cachedMetrics.cacheKey, cacheKey)
      )
    );

  // Insert new cache
  await database.insert(cachedMetrics).values({
    storeId,
    cacheKey,
    dateRange,
    metricsData: metricsData as any,
    lastRefreshedAt: new Date(),
  });
}

/**
 * Clear all cache for a store (used when COGS/shipping/expenses updated)
 */
export async function clearStoreCache(storeId: number) {
  const database = await db.getDb();
  if (!database) return;

  await database
    .delete(cachedMetrics)
    .where(eq(cachedMetrics.storeId, storeId));
}

/**
 * Clear old cache entries (older than 90 days)
 */
export async function clearOldCache() {
  const database = await db.getDb();
  if (!database) return;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  await database
    .delete(cachedMetrics)
    .where(gte(cachedMetrics.createdAt, ninetyDaysAgo));
}

/**
 * Get date range for last N days
 */
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Check if date range is cacheable
 * Rules:
 * - Today's date is NEVER cached (real-time orders)
 * - Date ranges including today are NOT cached
 * - Historical dates (yesterday and older) ARE cached if within 90 days
 */
export function isCacheable(startDate: string, endDate: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // If date range includes today, don't cache
  if (endDate >= today) {
    return false;
  }
  
  // If start date is older than 90 days, don't cache
  const start = new Date(startDate);
  if (start < ninetyDaysAgo) {
    return false;
  }
  
  return true;
}
