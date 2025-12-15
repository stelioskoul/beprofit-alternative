import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, unique, tinyint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional now (for OAuth compatibility)
  email: varchar("email", { length: 320 }).notNull().unique(), // Required and unique for email/password auth
  passwordHash: text("passwordHash"), // For email/password auth
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email"), // 'email' or 'oauth'
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores - Each user can have multiple e-commerce stores
 */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // 'shopify', 'woocommerce', etc.
  currency: varchar("currency", { length: 3 }).default("USD"),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"), // IANA timezone: America/New_York, America/Los_Angeles, Europe/Athens
  timezoneOffset: int("timezoneOffset").default(-300), // Deprecated: kept for backward compatibility
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * Shopify OAuth connections
 */
export const shopifyConnections = mysqlTable("shopify_connections", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().unique(), // One Shopify connection per store
  shopDomain: varchar("shopDomain", { length: 255 }).notNull(),
  accessToken: text("accessToken").notNull(),
  scopes: text("scopes"), // Comma-separated OAuth scopes
  apiVersion: varchar("apiVersion", { length: 20 }).default("2025-10"),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
});

export type ShopifyConnection = typeof shopifyConnections.$inferSelect;
export type InsertShopifyConnection = typeof shopifyConnections.$inferInsert;

/**
 * Facebook Ad Account connections
 */
export const facebookConnections = mysqlTable("facebook_connections", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  adAccountId: varchar("adAccountId", { length: 255 }).notNull(),
  accessToken: text("accessToken").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  apiVersion: varchar("apiVersion", { length: 20 }).default("v21.0"),
  timezoneOffset: int("timezoneOffset").default(-300),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
}, (table) => ({
  uniqueStoreAccount: unique().on(table.storeId, table.adAccountId),
}));

export type FacebookConnection = typeof facebookConnections.$inferSelect;
export type InsertFacebookConnection = typeof facebookConnections.$inferInsert;

/**
 * COGS (Cost of Goods Sold) configuration per store variant
 */
export const cogsConfig = mysqlTable("cogs_config", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  variantId: varchar("variantId", { length: 255 }).notNull(),
  productTitle: text("productTitle"),
  cogsValue: decimal("cogsValue", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueStoreVariant: unique().on(table.storeId, table.variantId),
}));

export type CogsConfig = typeof cogsConfig.$inferSelect;
export type InsertCogsConfig = typeof cogsConfig.$inferInsert;

/**
 * Shipping cost configuration per store (complex tiered structure stored as JSON)
 */
export const shippingConfig = mysqlTable("shipping_config", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  variantId: varchar("variantId", { length: 255 }).notNull(),
  productTitle: text("productTitle"),
  configJson: text("configJson").notNull(), // JSON: { shippingType: { region: { quantity: cost } } }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueStoreVariantShipping: unique().on(table.storeId, table.variantId),
}));

export type ShippingConfig = typeof shippingConfig.$inferSelect;
export type InsertShippingConfig = typeof shippingConfig.$inferInsert;

/**
 * Operational expenses per store
 */
export const operationalExpenses = mysqlTable("operational_expenses", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  type: mysqlEnum("type", ["one_time", "monthly", "yearly"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  date: date("date"), // For one_time expenses
  startDate: date("startDate"), // For recurring expenses
  endDate: date("endDate"), // Optional end date for recurring (null means still active)
  isActive: int("isActive").default(1), // 1 = active, 0 = inactive (for recurring only)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationalExpense = typeof operationalExpenses.$inferSelect;
export type InsertOperationalExpense = typeof operationalExpenses.$inferInsert;

/**
 * Payment processing fee configuration per store
 */
export const processingFeesConfig = mysqlTable("processing_fees_config", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().unique(),
  percentFee: decimal("percentFee", { precision: 5, scale: 4 }).default("0.0280"), // 2.8%
  fixedFee: decimal("fixedFee", { precision: 10, scale: 2 }).default("0.29"), // $0.29
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessingFeesConfig = typeof processingFeesConfig.$inferSelect;
export type InsertProcessingFeesConfig = typeof processingFeesConfig.$inferInsert;

/**
 * Currency exchange rates
 */
export const exchangeRates = mysqlTable("exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("fromCurrency", { length: 3 }).notNull(),
  toCurrency: varchar("toCurrency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
  effectiveDate: date("effectiveDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueCurrencyPairDate: unique().on(table.fromCurrency, table.toCurrency, table.effectiveDate),
}));

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

/**
 * Shipping Profiles - Reusable shipping configuration templates
 */
export const shippingProfiles = mysqlTable("shipping_profiles", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Standard Shipping", "Heavy Items", "International"
  description: text("description"),
  configJson: text("configJson").notNull(), // JSON: { shippingType: { region: { quantity: cost } } }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShippingProfile = typeof shippingProfiles.$inferSelect;
export type InsertShippingProfile = typeof shippingProfiles.$inferInsert;

/**
 * Product Shipping Profiles - Junction table linking products/variants to shipping profiles
 */
export const productShippingProfiles = mysqlTable("product_shipping_profiles", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  variantId: varchar("variantId", { length: 255 }).notNull(),
  profileId: int("profileId").notNull(),
  productTitle: text("productTitle"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueStoreVariantProfile: unique().on(table.storeId, table.variantId),
}));

export type ProductShippingProfile = typeof productShippingProfiles.$inferSelect;
export type InsertProductShippingProfile = typeof productShippingProfiles.$inferInsert;

// Removed cached_metrics table - caching system removed
