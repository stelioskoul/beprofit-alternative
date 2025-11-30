# Database Schema Design - Multi-User BeProfit Alternative

## Overview

This document defines the complete database schema for the multi-user profit tracking application. The schema supports multiple users, each with multiple stores, and each store can have connections to Shopify, Facebook Ads, and TikTok Ads.

## Core Principles

1. **Multi-tenancy**: All data is scoped to users and stores
2. **Security**: Row-level isolation through foreign keys
3. **Flexibility**: JSON columns for complex configurations
4. **Performance**: Indexed foreign keys and timestamps

## Tables

### 1. users (Already exists from template)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2. stores

Represents a user's e-commerce store (can be Shopify, WooCommerce, etc.)

```sql
CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'shopify', 'woocommerce', etc.
  currency VARCHAR(3) DEFAULT 'USD',
  timezoneOffset INT DEFAULT -300, -- Store timezone in minutes from UTC
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
);
```

### 3. shopify_connections

OAuth connection details for Shopify stores

```sql
CREATE TABLE shopify_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL UNIQUE, -- One Shopify connection per store
  shopDomain VARCHAR(255) NOT NULL,
  accessToken TEXT NOT NULL, -- Encrypted access token
  scopes TEXT, -- Comma-separated OAuth scopes
  apiVersion VARCHAR(20) DEFAULT '2025-10',
  connectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  lastSyncAt TIMESTAMP NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId)
);
```

### 4. facebook_connections

OAuth connection details for Facebook Ad accounts

```sql
CREATE TABLE facebook_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  adAccountId VARCHAR(255) NOT NULL,
  accessToken TEXT NOT NULL, -- Long-lived user access token
  tokenExpiresAt TIMESTAMP NULL,
  apiVersion VARCHAR(20) DEFAULT 'v21.0',
  timezoneOffset INT DEFAULT -300, -- Ad account timezone
  connectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  lastSyncAt TIMESTAMP NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId),
  UNIQUE KEY unique_store_account (storeId, adAccountId)
);
```

### 5. tiktok_connections

OAuth connection details for TikTok Ad accounts

```sql
CREATE TABLE tiktok_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  advertiserId VARCHAR(255) NOT NULL,
  accessToken TEXT NOT NULL,
  refreshToken TEXT,
  tokenExpiresAt TIMESTAMP NULL,
  connectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  lastSyncAt TIMESTAMP NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId),
  UNIQUE KEY unique_store_advertiser (storeId, advertiserId)
);
```

### 6. cogs_config

Cost of Goods Sold configuration per store variant

```sql
CREATE TABLE cogs_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  variantId VARCHAR(255) NOT NULL, -- Shopify variant ID or product ID
  productTitle TEXT, -- For reference
  cogsValue DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId),
  UNIQUE KEY unique_store_variant (storeId, variantId)
);
```

### 7. shipping_config

Shipping cost configuration per store (complex tiered structure)

```sql
CREATE TABLE shipping_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  variantId VARCHAR(255) NOT NULL,
  productTitle TEXT, -- For reference
  configJson TEXT NOT NULL, -- JSON structure: { shippingType: { region: { quantity: cost } } }
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId),
  UNIQUE KEY unique_store_variant_shipping (storeId, variantId)
);
```

**Example configJson structure:**
```json
{
  "free": {
    "USA": { "1": 4.5, "2": 6.0, "3": 7.5 },
    "CANADA": { "1": 6.0, "2": 8.0, "3": 10.0 },
    "EU": { "1": 8.0, "2": 12.0, "3": 16.0 }
  },
  "express": {
    "USA": { "1": 12.0, "2": 15.0, "3": 18.0 },
    "CANADA": { "1": 15.0, "2": 18.0, "3": 21.0 },
    "EU": { "1": 20.0, "2": 25.0, "3": 30.0 }
  }
}
```

### 8. operational_expenses

Store-specific operational expenses

```sql
CREATE TABLE operational_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  type ENUM('one_time', 'monthly', 'yearly') NOT NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  date DATE NULL, -- For one_time expenses
  startDate DATE NULL, -- For recurring expenses
  endDate DATE NULL, -- Optional end date for recurring
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_storeId (storeId),
  INDEX idx_dates (startDate, endDate)
);
```

### 9. processing_fees_config

Payment processing fee configuration per store

```sql
CREATE TABLE processing_fees_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL UNIQUE,
  percentFee DECIMAL(5, 4) DEFAULT 0.0280, -- 2.8%
  fixedFee DECIMAL(10, 2) DEFAULT 0.29, -- $0.29 per transaction
  currency VARCHAR(3) DEFAULT 'USD',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);
```

### 10. exchange_rates

Currency exchange rates (optional, for multi-currency support)

```sql
CREATE TABLE exchange_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fromCurrency VARCHAR(3) NOT NULL,
  toCurrency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  effectiveDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_currency_pair_date (fromCurrency, toCurrency, effectiveDate),
  INDEX idx_currencies (fromCurrency, toCurrency)
);
```

### 11. metrics_cache (Optional - Performance Optimization)

Cache for expensive metric calculations

```sql
CREATE TABLE metrics_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  dateFrom DATE NOT NULL,
  dateTo DATE NOT NULL,
  metricsJson TEXT NOT NULL, -- Cached calculation results
  calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_store_dates (storeId, dateFrom, dateTo)
);
```

## Data Flow

### User Registration Flow
1. User signs up via Manus OAuth
2. User record created in `users` table
3. User redirected to dashboard

### Store Connection Flow
1. User creates a store entry in `stores` table
2. User initiates OAuth for Shopify/Facebook/TikTok
3. OAuth callback stores tokens in respective connection tables
4. Store is now ready to fetch data

### Profit Calculation Flow
1. Fetch orders from Shopify (via `shopify_connections`)
2. Fetch ad spend from Facebook (via `facebook_connections`)
3. Fetch ad spend from TikTok (via `tiktok_connections`)
4. Calculate COGS using `cogs_config`
5. Calculate shipping using `shipping_config`
6. Calculate processing fees using `processing_fees_config`
7. Fetch operational expenses from `operational_expenses`
8. Compute: Revenue - COGS - Shipping - Processing Fees - Ad Spend - OpEx = Net Profit

## Security Considerations

1. **Access Tokens**: All OAuth tokens stored encrypted in TEXT fields
2. **User Isolation**: All queries must filter by `userId` or `storeId`
3. **Cascading Deletes**: When user deleted, all related data removed
4. **Foreign Keys**: Enforce referential integrity
5. **Indexes**: Optimize query performance for user-scoped data

## Migration Strategy

1. Create all tables in order (respecting foreign key dependencies)
2. Seed default processing fee config for new stores
3. Migrate existing single-store data (if needed) to first user's store
4. Test multi-user isolation with sample data

## Next Steps

1. Create Drizzle schema definitions
2. Generate and apply migrations
3. Implement tRPC procedures for CRUD operations
4. Build OAuth integration handlers
5. Create UI for store and connection management
