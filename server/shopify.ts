import { getApiCredential, getAllProducts } from "./db";
import { getExchangeRate, decrypt } from "./utils";

interface ShopifyLineItem {
  id: number;
  variant_id: number;
  product_id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  name: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  current_total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  line_items: ShopifyLineItem[];
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyTransaction {
  id: number;
  order_id: number;
  kind: string;
  gateway: string;
  status: string;
  amount: string;
  currency: string;
  fees: Array<{
    amount: string;
    rate: string;
    type: string;
  }>;
}

interface ShopifyTransactionsResponse {
  transactions: ShopifyTransaction[];
}

export interface OrderMetrics {
  revenue: number; // in cents (EUR)
  cogs: number; // in cents (EUR)
  shipping: number; // in cents (EUR)
  orderCount: number;
  processingFees?: number; // in cents (EUR)
}

/**
 * Fetch ALL orders from Shopify for a date range with pagination
 * Uses since_id pagination to handle large result sets
 */
async function fetchAllOrders(
  storeDomain: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<ShopifyOrder[]> {
  const startDateTime = `${startDate}T00:00:00Z`;
  const endDateTime = `${endDate}T23:59:59Z`;
  
  let allOrders: ShopifyOrder[] = [];
  let sinceId: number | null = null;
  let pageCount = 0;
  
  console.log(`[Shopify] Starting to fetch orders from ${startDate} to ${endDate}`);
  
  while (true) {
    pageCount++;
    
    // Build URL with pagination
    let url = `https://${storeDomain}/admin/api/2024-01/orders.json?`
      + `status=any`
      + `&financial_status=paid`
      + `&created_at_min=${encodeURIComponent(startDateTime)}`
      + `&created_at_max=${encodeURIComponent(endDateTime)}`
      + `&limit=250`;
    
    if (sinceId) {
      url += `&since_id=${sinceId}`;
    }
    
    console.log(`[Shopify] Fetching page ${pageCount}...`);
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Shopify] API error:", error);
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    const data: ShopifyOrdersResponse = await response.json();
    
    // Filter out cancelled orders
    const validOrders = data.orders.filter(order => !order.cancelled_at);
    
    console.log(`[Shopify] Page ${pageCount}: fetched ${data.orders.length} orders, ${validOrders.length} valid (non-cancelled)`);
    
    if (validOrders.length === 0) {
      break; // No more orders
    }
    
    allOrders.push(...validOrders);
    
    // If we got less than 250 orders, we've reached the end
    if (data.orders.length < 250) {
      console.log(`[Shopify] Reached end of results (got ${data.orders.length} < 250)`);
      break;
    }
    
    // Use the last order's ID for next page
    sinceId = data.orders[data.orders.length - 1].id;
    
    // Safety limit to prevent infinite loops
    if (pageCount >= 100) {
      console.warn(`[Shopify] Reached safety limit of 100 pages (${allOrders.length} orders fetched)`);
      break;
    }
  }
  
  console.log(`[Shopify] ✓ Fetched ${allOrders.length} total orders in ${pageCount} pages`);
  
  return allOrders;
}

/**
 * Fetch processing fees for an order from Shopify Transactions API
 */
async function fetchOrderProcessingFees(
  storeDomain: string,
  accessToken: string,
  orderId: number
): Promise<number> {
  try {
    const url = `https://${storeDomain}/admin/api/2024-01/orders/${orderId}/transactions.json`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[Shopify] Failed to fetch transactions for order ${orderId}`);
      return 0;
    }

    const data: ShopifyTransactionsResponse = await response.json();
    
    // Sum up all fees from successful transactions
    let totalFees = 0;
    for (const transaction of data.transactions) {
      if (transaction.status === "success" && transaction.fees) {
        for (const fee of transaction.fees) {
          totalFees += parseFloat(fee.amount || "0");
        }
      }
    }
    
    return totalFees;
  } catch (error) {
    console.warn(`[Shopify] Error fetching fees for order ${orderId}:`, error);
    return 0;
  }
}

/**
 * Calculate metrics from Shopify orders for a date range
 * NO CACHING - always fetches fresh data
 */
export async function getShopifyOrders(startDate: string, endDate: string): Promise<OrderMetrics> {
  try {
    // Get credentials
    const credential = await getApiCredential("shopify");
    if (!credential?.accessToken || !credential?.storeDomain) {
      console.warn("[Shopify] No credentials configured");
      return { revenue: 0, cogs: 0, shipping: 0, orderCount: 0, processingFees: 0 };
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    console.log(`\n========== SHOPIFY METRICS CALCULATION ==========`);
    console.log(`Period: ${startDate} to ${endDate}`);
    console.log(`Store: ${storeDomain}`);
    
    // Fetch ALL orders with pagination
    const allOrders = await fetchAllOrders(storeDomain, accessToken, startDate, endDate);
    
    if (allOrders.length === 0) {
      console.log(`[Shopify] No orders found for this period`);
      return { revenue: 0, cogs: 0, shipping: 0, orderCount: 0, processingFees: 0 };
    }
    
    // Get product costs from database
    const products = await getAllProducts();
    const productCostByVariantId = new Map(
      products.filter(p => p.variantId).map(p => [p.variantId!, { cogs: p.cogs, shipping: p.shippingCost }])
    );
    const productCostBySku = new Map(
      products.map(p => [p.sku, { cogs: p.cogs, shipping: p.shippingCost }])
    );
    
    console.log(`[Shopify] Loaded ${products.length} products from database for COGS matching`);

    // Get exchange rate once
    const exchangeRate = await getExchangeRate("USD", "EUR");
    console.log(`[Shopify] Exchange rate: 1 USD = ${exchangeRate.toFixed(4)} EUR`);
    
    // Calculate metrics
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalShipping = 0;
    let totalProcessingFees = 0;
    const orderCount = allOrders.length;

    console.log(`\n[Shopify] Processing ${orderCount} orders...`);
    
    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      
      // Log progress every 50 orders
      if ((i + 1) % 50 === 0 || i === 0 || i === allOrders.length - 1) {
        console.log(`[Shopify] Processing order ${i + 1}/${allOrders.length} (#${order.order_number})...`);
      }
      
      // Revenue: Use current_total_price (accounts for refunds)
      const orderTotal = parseFloat(order.current_total_price || order.total_price || "0");
      const currency = order.currency || "USD";
      
      // Convert to EUR cents
      let revenueInCents = Math.round(orderTotal * 100);
      if (currency === "USD") {
        revenueInCents = Math.round(revenueInCents * exchangeRate);
      }
      totalRevenue += revenueInCents;

      // Calculate COGS and shipping from line items
      for (const item of order.line_items || []) {
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
      
      // Fetch processing fees (skip for now to speed up - can enable later)
      // const fees = await fetchOrderProcessingFees(storeDomain, accessToken, order.id);
      // if (currency === "USD") {
      //   totalProcessingFees += Math.round(fees * 100 * exchangeRate);
      // } else {
      //   totalProcessingFees += Math.round(fees * 100);
      // }
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Revenue: €${(totalRevenue / 100).toFixed(2)}`);
    console.log(`COGS: €${(totalCogs / 100).toFixed(2)}`);
    console.log(`Shipping: €${(totalShipping / 100).toFixed(2)}`);
    console.log(`Processing Fees: €${(totalProcessingFees / 100).toFixed(2)}`);
    console.log(`================================\n`);

    return {
      revenue: totalRevenue,
      cogs: totalCogs,
      shipping: totalShipping,
      orderCount,
      processingFees: totalProcessingFees,
    };
  } catch (error) {
    console.error("[Shopify] Failed to fetch orders:", error);
    return { revenue: 0, cogs: 0, shipping: 0, orderCount: 0, processingFees: 0 };
  }
}

/**
 * Fetch raw orders for the Orders page with date filtering
 */
export async function getRawOrders(startDate?: string, endDate?: string): Promise<any[]> {
  try {
    const credential = await getApiCredential("shopify");
    if (!credential?.accessToken || !credential?.storeDomain) {
      return [];
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    // If no date range specified, fetch last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    const allOrders = await fetchAllOrders(storeDomain, accessToken, startDate, endDate);
    
    // Get exchange rate
    const exchangeRate = await getExchangeRate("USD", "EUR");

    // Format orders for display
    return allOrders.map(order => {
      const orderTotal = parseFloat(order.current_total_price || order.total_price || "0");
      const currency = order.currency || "USD";
      
      // Convert to EUR
      let amountPaidEur = orderTotal;
      if (currency === "USD") {
        amountPaidEur = orderTotal * exchangeRate;
      }
      
      // Calculate processing fee (2.9% + €0.30 as estimate)
      const processingFee = amountPaidEur * 0.029 + 0.30;

      return {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        financial_status: order.financial_status,
        customer_name: order.customer 
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : 'Guest',
        line_items: order.line_items.map(item => ({
          quantity: item.quantity,
          name: item.name,
        })),
        amount_paid: amountPaidEur,
        processing_fee: processingFee,
        currency: 'EUR',
      };
    });
  } catch (error) {
    console.error("[Shopify] Failed to fetch raw orders:", error);
    return [];
  }
}
