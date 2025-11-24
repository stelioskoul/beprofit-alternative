/**
 * One-time script to import historical orders from Shopify API into webhook database
 * This backfills the database with existing orders so webhooks only handle new orders
 */

import { getDb } from "./db";
import { shopifyOrders, shopifyOrderItems } from "../drizzle/schema";
import { getApiCredential } from "./db";
import { decrypt } from "./utils";

async function importHistoricalOrders() {
  console.log("[Import] Starting historical order import...");
  
  // Get Shopify credentials
  const shopifyCreds = await getApiCredential("shopify");
  if (!shopifyCreds || !shopifyCreds.accessToken || !shopifyCreds.storeDomain) {
    console.error("[Import] Shopify credentials not found. Please configure in Settings.");
    process.exit(1);
  }
  
  const accessToken = decrypt(shopifyCreds.accessToken);
  const storeDomain = shopifyCreds.storeDomain;
  
  const db = await getDb();
  if (!db) {
    console.error("[Import] Database not available");
    process.exit(1);
  }
  
  let totalImported = 0;
  let hasMore = true;
  let pageInfo: string | null = null;
  
  while (hasMore) {
    console.log(`[Import] Fetching orders... (imported ${totalImported} so far)`);
    
    try {
      // Use cursor-based pagination
      let url;
      if (pageInfo) {
        // When using page_info, don't add status=any (it's encoded in page_info)
        url = `https://${storeDomain}/admin/api/2024-01/orders.json?limit=250&page_info=${pageInfo}`;
      } else {
        url = `https://${storeDomain}/admin/api/2024-01/orders.json?limit=250&status=any`;
      }
      
      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        console.error(`[Import] API error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const data = await response.json();
      const orders = data.orders || [];
      
      if (orders.length === 0) {
        hasMore = false;
        break;
      }
      
      console.log(`[Import] Processing ${orders.length} orders...`);
      
      for (const order of orders) {
        try {
          // Only import paid orders
          if (order.financial_status !== "paid") {
            continue;
          }
          
          // Convert total price to cents
          const totalPrice = Math.round(parseFloat(order.current_total_price || order.total_price || "0") * 100);
          
          // Insert order (skip if already exists)
          // Use Shopify's created_at as the createdAt timestamp
          const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
          
          const [insertedOrder] = await db.insert(shopifyOrders).values({
            shopifyOrderId: order.id.toString(),
            orderNumber: order.name,
            email: order.email || null,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status || null,
            totalPrice,
            currency: order.currency || "USD",
            processedAt: order.processed_at ? new Date(order.processed_at) : null,
            createdAt: orderCreatedAt, // Use Shopify's order creation date
            orderData: JSON.stringify({
              customer: order.customer,
              shipping_address: order.shipping_address,
              billing_address: order.billing_address,
            }),
          }).onDuplicateKeyUpdate({
            set: { 
              financialStatus: order.financial_status,
              createdAt: orderCreatedAt, // Update date if re-importing
            },
          });
          
          // Get the inserted order ID
          const orderId = insertedOrder.insertId;
          
          // Insert line items (skip duplicates)
          if (order.line_items && order.line_items.length > 0 && orderId) {
            for (const item of order.line_items) {
              await db.insert(shopifyOrderItems).values({
                orderId: Number(orderId),
                shopifyOrderId: order.id.toString(),
                lineItemId: item.id.toString(),
                productId: item.product_id?.toString() || null,
                variantId: item.variant_id?.toString() || null,
                sku: item.sku || null,
                title: item.title,
                variantTitle: item.variant_title || null,
                quantity: item.quantity,
                price: Math.round(parseFloat(item.price) * 100),
              }).onDuplicateKeyUpdate({
                set: { quantity: item.quantity }, // Update quantity if exists
              });
            }
          }
          
          totalImported++;
          
          if (totalImported % 100 === 0) {
            console.log(`[Import] Imported ${totalImported} orders so far...`);
          }
        } catch (error) {
          console.error(`[Import] Failed to import order ${order.id}:`, error);
        }
      }
      
      // Extract next page URL from Link header
      const linkHeader = response.headers.get('Link');
      
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (match && match[1]) {
          const nextUrl = new URL(match[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          pageInfo = null;
        }
      } else {
        pageInfo = null;
      }
      
      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[Import] Error fetching orders:`, error);
      break;
    }
  }
  
  console.log(`[Import] Complete! Imported ${totalImported} orders total.`);
  process.exit(0);
}

// Run the import
importHistoricalOrders().catch(error => {
  console.error("[Import] Fatal error:", error);
  process.exit(1);
});
