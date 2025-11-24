/**
 * Shopify API Integration
 * Fetches order data from Shopify Admin API
 */

import { getApiCredential, getCacheValue, setCacheValue, getAllProducts } from "./db";
import { decrypt } from "./utils";

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  current_total_price?: string;
  cancelled_at?: string | null;
  line_items: Array<{
    sku: string;
    variant_id: number;
    quantity: number;
    price: string;
  }>;
  shipping_lines: Array<{
    price: string;
  }>;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface OrderMetrics {
  revenue: number; // in cents
  cogs: number; // in cents
  shipping: number; // in cents
  orderCount: number;
}

export async function getShopifyOrders(startDate: string, endDate: string): Promise<OrderMetrics> {
  try {
    // Get credentials
    const credential = await getApiCredential("shopify");
    if (!credential?.accessToken || !credential?.storeDomain) {
      console.warn("[Shopify] No credentials configured");
      return { revenue: 0, cogs: 0, shipping: 0, orderCount: 0 };
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    // Check cache first (cache for 30 minutes)
    const cacheKey = `shopify_orders_${storeDomain}_${startDate}_${endDate}`;
    const cached = await getCacheValue(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from Shopify API
    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T23:59:59Z`;
    
    // Only fetch paid orders (excludes pending, refunded, voided)
    // status=any includes all order statuses (open, closed, cancelled)
    // We'll filter out cancelled orders in post-processing
    const url = `https://${storeDomain}/admin/api/2024-01/orders.json?financial_status=paid&created_at_min=${startDateTime}&created_at_max=${endDateTime}&limit=250`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Shopify] API error:", error);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data: ShopifyOrdersResponse = await response.json();
    
    // Get product costs from database
    const products = await getAllProducts();
    // Create map by variant ID for matching (fallback to SKU if no variant ID)
    const productCostByVariantId = new Map(
      products.filter(p => p.variantId).map(p => [p.variantId!, { cogs: p.cogs, shipping: p.shippingCost }])
    );
    const productCostBySku = new Map(
      products.map(p => [p.sku, { cogs: p.cogs, shipping: p.shippingCost }])
    );

    // Calculate metrics
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalShipping = 0;
    let orderCount = 0;

    for (const order of data.orders || []) {
      // Skip cancelled orders - only count closed/open orders that are paid
      // financial_status filter already ensures only 'paid' orders
      // But we also need to exclude orders that were later refunded
      if (order.cancelled_at) {
        continue; // Skip cancelled orders
      }
      
      orderCount++;
      
      // Revenue: Use current_total_price which accounts for refunds/adjustments
      // If not available, fall back to total_price
      const orderTotal = parseFloat(order.current_total_price || order.total_price || "0");
      totalRevenue += Math.round(orderTotal * 100);

      // Calculate COGS and shipping from line items
      for (const item of order.line_items || []) {
        // Try to match by variant ID first, then fall back to SKU
        const variantIdStr = String(item.variant_id);
        let productCost = productCostByVariantId.get(variantIdStr);
        
        if (!productCost && item.sku) {
          productCost = productCostBySku.get(item.sku);
        }
        
        if (productCost) {
          totalCogs += productCost.cogs * item.quantity;
          totalShipping += productCost.shipping * item.quantity;
        }
      }
    }

    const metrics: OrderMetrics = {
      revenue: totalRevenue,
      cogs: totalCogs,
      shipping: totalShipping,
      orderCount,
    };

    // Cache the result
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await setCacheValue(cacheKey, JSON.stringify(metrics), expiresAt);

    return metrics;
  } catch (error) {
    console.error("[Shopify] Failed to fetch orders:", error);
    return { revenue: 0, cogs: 0, shipping: 0, orderCount: 0 };
  }
}
