import { Router } from "express";
import { verifyWebhookHmac } from "./shopify-oauth";
import { getDb } from "./db";
import { products, shopifyOrders, shopifyOrderItems, shopifyRefunds, webhookLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const shopifyWebhooksRouter = Router();

// Helper to log webhook events
async function logWebhook(topic: string, shopDomain: string | undefined, payload: any, status: string, errorMessage?: string) {
  try {
    const db = await getDb();
    if (db) {
      await db.insert(webhookLogs).values({
        topic,
        shopDomain,
        payload: JSON.stringify(payload),
        status,
        errorMessage: errorMessage || null,
      });
    }
  } catch (error) {
    console.error("[Webhook] Failed to log webhook:", error);
  }
}

// Helper to convert USD to cents
function toCents(amount: string | number): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num * 100);
}

// Middleware to verify webhook authenticity
const verifyWebhook = (req: any, res: any, next: any) => {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  const body = JSON.stringify(req.body);

  if (!hmac || !verifyWebhookHmac(body, hmac as string)) {
    console.error("[Webhook] Invalid HMAC signature");
    return res.status(401).send("Unauthorized");
  }

  next();
};

// Orders created
shopifyWebhooksRouter.post("/orders/create", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const order = req.body;
    console.log(`[Webhook] Order created: ${order.id} - ${order.name}`);
    
    const db = await getDb();
    if (db) {
      // Store order
      const [insertedOrder] = await db.insert(shopifyOrders).values({
        shopifyOrderId: String(order.id),
        orderNumber: order.name,
        email: order.email || null,
        financialStatus: order.financial_status || null,
        fulfillmentStatus: order.fulfillment_status || null,
        totalPrice: toCents(order.total_price),
        subtotalPrice: order.subtotal_price ? toCents(order.subtotal_price) : null,
        totalTax: order.total_tax ? toCents(order.total_tax) : null,
        totalShipping: order.total_shipping ? toCents(order.total_shipping) : null,
        currency: order.currency || null,
        processedAt: order.processed_at ? new Date(order.processed_at) : null,
        cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
        orderData: JSON.stringify(order),
      });
      
      // Store line items
      if (order.line_items && Array.isArray(order.line_items)) {
        for (const item of order.line_items) {
          await db.insert(shopifyOrderItems).values({
            orderId: insertedOrder.insertId,
            shopifyOrderId: String(order.id),
            lineItemId: String(item.id),
            variantId: item.variant_id ? String(item.variant_id) : null,
            productId: item.product_id ? String(item.product_id) : null,
            sku: item.sku || null,
            title: item.title || null,
            variantTitle: item.variant_title || null,
            quantity: item.quantity,
            price: toCents(item.price),
            totalDiscount: item.total_discount ? toCents(item.total_discount) : null,
          });
        }
      }
    }
    
    await logWebhook("orders/create", shopDomain, order, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing order/create:", error);
    await logWebhook("orders/create", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Orders updated
shopifyWebhooksRouter.post("/orders/updated", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const order = req.body;
    console.log(`[Webhook] Order updated: ${order.id} - ${order.name}`);
    
    const db = await getDb();
    if (db) {
      // Update existing order
      await db.update(shopifyOrders)
        .set({
          orderNumber: order.name,
          email: order.email || null,
          financialStatus: order.financial_status || null,
          fulfillmentStatus: order.fulfillment_status || null,
          totalPrice: toCents(order.total_price),
          subtotalPrice: order.subtotal_price ? toCents(order.subtotal_price) : null,
          totalTax: order.total_tax ? toCents(order.total_tax) : null,
          totalShipping: order.total_shipping ? toCents(order.total_shipping) : null,
          currency: order.currency || null,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
          orderData: JSON.stringify(order),
        })
        .where(eq(shopifyOrders.shopifyOrderId, String(order.id)));
    }
    
    await logWebhook("orders/updated", shopDomain, order, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing order/updated:", error);
    await logWebhook("orders/updated", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Orders cancelled
shopifyWebhooksRouter.post("/orders/cancelled", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const order = req.body;
    console.log(`[Webhook] Order cancelled: ${order.id} - ${order.name}`);
    
    const db = await getDb();
    if (db) {
      await db.update(shopifyOrders)
        .set({
          financialStatus: order.financial_status || null,
          fulfillmentStatus: order.fulfillment_status || null,
          cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : new Date(),
          orderData: JSON.stringify(order),
        })
        .where(eq(shopifyOrders.shopifyOrderId, String(order.id)));
    }
    
    await logWebhook("orders/cancelled", shopDomain, order, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing order/cancelled:", error);
    await logWebhook("orders/cancelled", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Products created
shopifyWebhooksRouter.post("/products/create", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const product = req.body;
    console.log(`[Webhook] Product created: ${product.id} - ${product.title}`);
    
    // Auto-import new products
    const db = await getDb();
    if (db && product.variants) {
      for (const variant of product.variants) {
        const sku = variant.sku || `SHOPIFY-${variant.id}`;
        const productName = variant.title !== "Default Title" 
          ? `${product.title} - ${variant.title}`
          : product.title;
        
        try {
          await db.insert(products).values({
            userId: 1, // System user - will need to map to actual user
            sku,
            variantId: String(variant.id),
            productName,
            cogs: 0,
            shippingCost: 0,
          });
          console.log(`[Webhook] Auto-imported product: ${sku}`);
        } catch (error) {
          // Product might already exist
          console.log(`[Webhook] Product ${sku} already exists`);
        }
      }
    }
    
    await logWebhook("products/create", shopDomain, product, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing product/create:", error);
    await logWebhook("products/create", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Products updated
shopifyWebhooksRouter.post("/products/update", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const product = req.body;
    console.log(`[Webhook] Product updated: ${product.id} - ${product.title}`);
    
    // Update product names if they changed
    const db = await getDb();
    if (db && product.variants) {
      for (const variant of product.variants) {
        const variantId = String(variant.id);
        const productName = variant.title !== "Default Title" 
          ? `${product.title} - ${variant.title}`
          : product.title;
        
        try {
          await db.update(products)
            .set({ productName })
            .where(eq(products.variantId, variantId));
        } catch (error) {
          console.error(`[Webhook] Failed to update product ${variantId}:`, error);
        }
      }
    }
    
    await logWebhook("products/update", shopDomain, product, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing product/update:", error);
    await logWebhook("products/update", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Products deleted
shopifyWebhooksRouter.post("/products/delete", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const product = req.body;
    console.log(`[Webhook] Product deleted: ${product.id} - ${product.title}`);
    
    // Optionally delete from database or mark as inactive
    
    await logWebhook("products/delete", shopDomain, product, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing product/delete:", error);
    await logWebhook("products/delete", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});

// Refunds created
shopifyWebhooksRouter.post("/refunds/create", verifyWebhook, async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  
  try {
    const refund = req.body;
    console.log(`[Webhook] Refund created: ${refund.id} for order ${refund.order_id}`);
    
    const db = await getDb();
    if (db) {
      // Calculate total refund amount
      let totalAmount = 0;
      if (refund.transactions && Array.isArray(refund.transactions)) {
        for (const transaction of refund.transactions) {
          if (transaction.kind === 'refund') {
            totalAmount += toCents(transaction.amount);
          }
        }
      }
      
      // Store refund
      await db.insert(shopifyRefunds).values({
        shopifyRefundId: String(refund.id),
        shopifyOrderId: String(refund.order_id),
        orderId: null, // Will need to look up from shopifyOrders table
        amount: totalAmount,
        currency: refund.currency || null,
        note: refund.note || null,
        processedAt: refund.processed_at ? new Date(refund.processed_at) : new Date(),
        refundData: JSON.stringify(refund),
      });
    }
    
    await logWebhook("refunds/create", shopDomain, refund, "success");
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook] Error processing refund/create:", error);
    await logWebhook("refunds/create", shopDomain, req.body, "error", String(error));
    res.status(500).send("Error");
  }
});
