import { fetchShopifyOrders } from "./shopify-data";
import { fetchFacebookAdSpend } from "./facebook-data";
import * as db from "./db";
import * as cache from "./cache";

/**
 * Fetch and cache raw API data (Shopify orders + Facebook ad spend)
 * This is what gets cached - the slow API calls
 */
export async function fetchAndCacheApiData(
  storeId: number,
  startDate: string,
  endDate: string
) {
  console.log(`[Metrics] Fetching API data for store ${storeId} (${startDate} to ${endDate})`);

  try {
    // Get store and connection info
    const store = await db.getStoreById(storeId);
    if (!store) throw new Error(`Store ${storeId} not found`);

    const shopifyConn = await db.getShopifyConnectionByStoreId(storeId);
    if (!shopifyConn) throw new Error(`Shopify connection not found for store ${storeId}`);

    // Fetch from APIs (this is the slow part - 20-30 seconds)
    const orders = await fetchShopifyOrders(
      shopifyConn.shopDomain,
      shopifyConn.accessToken,
      { fromDate: startDate, toDate: endDate },
      store.timezoneOffset || -300,
      shopifyConn.apiVersion || "2025-10"
    );

    // Fetch Facebook ad spend (optional)
    let adSpend = 0;
    let adCurrency = "USD";
    try {
      const fbConn = await db.getFacebookConnectionsByStoreId(storeId);
      if (fbConn.length > 0) {
        const fbData = await fetchFacebookAdSpend(
          fbConn[0].adAccountId,
          fbConn[0].accessToken,
          { fromDate: startDate, toDate: endDate },
          "v21.0"
        );
        adSpend = fbData.spend;
        adCurrency = fbData.currency;
      }
    } catch (error) {
      console.warn(`[Metrics] Facebook ad spend fetch failed:`, error);
    }

    // Cache the raw API responses
    const apiData = {
      orders,
      adSpend,
      adCurrency,
      fetchedAt: new Date().toISOString(),
    };

    await cache.setCachedMetrics(storeId, startDate, endDate, apiData);

    console.log(`[Metrics] ✓ Cached API data for store ${storeId}: ${orders.length} orders, $${adSpend} ad spend`);

    return apiData;
  } catch (error) {
    console.error(`[Metrics] ✗ Failed to fetch API data for store ${storeId}:`, error);
    throw error;
  }
}

/**
 * Get API data from cache or fetch if not cached
 */
export async function getApiData(
  storeId: number,
  startDate: string,
  endDate: string
) {
  // Check if date range is cacheable (within last 90 days)
  if (!cache.isCacheable(startDate, endDate)) {
    console.log(`[Metrics] Date range too old, fetching directly from API`);
    return await fetchAndCacheApiData(storeId, startDate, endDate);
  }

  // Try to get from cache
  const cached = await cache.getCachedMetrics(storeId, startDate, endDate);
  
  if (cached) {
    console.log(`[Metrics] ✓ Using cached API data for store ${storeId}`);
    return cached;
  }

  // Not in cache, fetch and cache
  console.log(`[Metrics] Cache miss, fetching from API`);
  return await fetchAndCacheApiData(storeId, startDate, endDate);
}

/**
 * Calculate dashboard metrics from cached API data
 * This is fast because we're just doing calculations, no API calls
 */
export async function calculateDashboardMetrics(
  storeId: number,
  startDate: string,
  endDate: string
) {
  // This function will be implemented in the dashboard router
  // It uses getApiData() to get cached orders/adSpend
  // Then calculates metrics using current COGS/shipping/expenses config
  return {};
}
