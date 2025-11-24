import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table - stores SKU, tiered COGS, and region-based shipping
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sku: varchar("sku", { length: 255 }), // Optional SKU for reference
  variantId: varchar("variantId", { length: 255 }).notNull().unique(), // Shopify variant ID - primary identifier
  productName: text("productName"), // Full product name including variant details
  cogs: int("cogs").notNull(), // Store as cents - flat rate per unit
  shippingCost: int("shippingCost").notNull(), // Store as cents - legacy field for backward compatibility
  // Region-based tiered shipping: JSON object with zones and quantity tiers
  // Format: { "EU": { "1": 500, "2": 700, "3": 900, "4": 1100 }, "USA": {...}, "Canada": {...}, "ROW": {...} }
  shippingTiers: text("shippingTiers"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Operational expenses table - supports one-time, monthly, and yearly expenses
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  amount: int("amount").notNull(), // Store as cents
  expenseType: mysqlEnum("expenseType", ["one_time", "monthly", "yearly"]).notNull(),
  date: varchar("date", { length: 10 }), // YYYY-MM-DD for one-time expenses
  startDate: varchar("startDate", { length: 10 }), // YYYY-MM-DD for recurring
  endDate: varchar("endDate", { length: 10 }), // YYYY-MM-DD for recurring (optional)
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Disputes table - tracks dispute losses by date range
 */
export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(), // YYYY-MM-DD
  amount: int("amount").notNull(), // Store as cents
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

/**
 * API credentials table - encrypted storage for Facebook and Shopify credentials
 */
export const apiCredentials = mysqlTable("apiCredentials", {
  id: int("id").autoincrement().primaryKey(),
  service: varchar("service", { length: 50 }).notNull().unique(), // 'facebook' or 'shopify'
  accessToken: text("accessToken"), // Encrypted
  accountId: varchar("accountId", { length: 255 }), // For Facebook Ad Account ID
  storeDomain: varchar("storeDomain", { length: 255 }), // For Shopify domain
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiCredential = typeof apiCredentials.$inferSelect;
export type InsertApiCredential = typeof apiCredentials.$inferInsert;

/**
 * Cache table - for storing API responses and exchange rates
 */
export const cache = mysqlTable("cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  cacheValue: text("cacheValue").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cache = typeof cache.$inferSelect;
export type InsertCache = typeof cache.$inferInsert;

/**
 * Shopify OAuth tokens table - stores access tokens from OAuth flow
 */
export const shopifyTokens = mysqlTable("shopifyTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shopDomain: varchar("shopDomain", { length: 255 }).notNull(),
  accessToken: text("accessToken").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShopifyToken = typeof shopifyTokens.$inferSelect;
export type InsertShopifyToken = typeof shopifyTokens.$inferInsert;

/**
 * Shopify orders table - stores order data from webhooks
 */
export const shopifyOrders = mysqlTable("shopifyOrders", {
  id: int("id").autoincrement().primaryKey(),
  shopifyOrderId: varchar("shopifyOrderId", { length: 255 }).notNull().unique(),
  orderNumber: varchar("orderNumber", { length: 255 }),
  email: varchar("email", { length: 320 }),
  financialStatus: varchar("financialStatus", { length: 50 }),
  fulfillmentStatus: varchar("fulfillmentStatus", { length: 50 }),
  totalPrice: int("totalPrice").notNull(), // Store as cents
  subtotalPrice: int("subtotalPrice"),
  totalTax: int("totalTax"),
  totalShipping: int("totalShipping"),
  currency: varchar("currency", { length: 10 }),
  processedAt: timestamp("processedAt"),
  cancelledAt: timestamp("cancelledAt"),
  orderData: text("orderData"), // Full JSON payload
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShopifyOrder = typeof shopifyOrders.$inferSelect;
export type InsertShopifyOrder = typeof shopifyOrders.$inferInsert;

/**
 * Shopify order line items table - stores individual items from orders
 */
export const shopifyOrderItems = mysqlTable("shopifyOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(), // References shopifyOrders.id
  shopifyOrderId: varchar("shopifyOrderId", { length: 255 }).notNull(),
  lineItemId: varchar("lineItemId", { length: 255 }).notNull(),
  variantId: varchar("variantId", { length: 255 }),
  productId: varchar("productId", { length: 255 }),
  sku: varchar("sku", { length: 255 }),
  title: text("title"),
  variantTitle: text("variantTitle"),
  quantity: int("quantity").notNull(),
  price: int("price").notNull(), // Store as cents
  totalDiscount: int("totalDiscount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShopifyOrderItem = typeof shopifyOrderItems.$inferSelect;
export type InsertShopifyOrderItem = typeof shopifyOrderItems.$inferInsert;

/**
 * Shopify refunds table - stores refund data from webhooks
 */
export const shopifyRefunds = mysqlTable("shopifyRefunds", {
  id: int("id").autoincrement().primaryKey(),
  shopifyRefundId: varchar("shopifyRefundId", { length: 255 }).notNull().unique(),
  shopifyOrderId: varchar("shopifyOrderId", { length: 255 }).notNull(),
  orderId: int("orderId"), // References shopifyOrders.id
  amount: int("amount").notNull(), // Store as cents
  currency: varchar("currency", { length: 10 }),
  note: text("note"),
  processedAt: timestamp("processedAt"),
  refundData: text("refundData"), // Full JSON payload
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShopifyRefund = typeof shopifyRefunds.$inferSelect;
export type InsertShopifyRefund = typeof shopifyRefunds.$inferInsert;

/**
 * Webhook logs table - tracks all webhook deliveries for debugging
 */
export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  topic: varchar("topic", { length: 100 }).notNull(),
  shopDomain: varchar("shopDomain", { length: 255 }),
  payload: text("payload"),
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'error', 'skipped'
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
