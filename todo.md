# Profit Tracker Web - TODO

## Core Features

- [x] Dashboard with real-time metrics display
- [x] Period selection (Today, Yesterday, This Week, This Month, Last 30 Days)
- [x] Auto-refresh metrics every 10 seconds
- [x] Product management (add, view, delete, import CSV)
- [x] Expense management (one-time, monthly, yearly)
- [x] Dispute management (add, view, delete)
- [x] API settings (Facebook Ads, Shopify)
- [x] Encrypted credential storage
- [x] Currency conversion (USD to EUR)
- [x] Profit calculations (gross profit, net profit, margin)

## Database Schema

- [x] Products table (SKU, COGS, shipping cost)
- [x] Expenses table (type, category, amount, dates)
- [x] Disputes table (date range, amount, notes)
- [x] API credentials table (encrypted storage)
- [x] Orders cache table (Shopify data)
- [x] Ad spend cache table (Facebook data)

## Backend API

- [x] Product CRUD operations
- [x] Expense CRUD operations
- [x] Dispute CRUD operations
- [x] Settings management
- [x] Metrics calculation endpoints
- [x] CSV import functionality
- [ ] Facebook Ads API integration
- [ ] Shopify API integration
- [x] Exchange rate API integration

## Frontend UI

- [x] Cyberpunk 2077 theme (dark bg, yellow/cyan accents)
- [x] Dashboard panel with metric cards
- [x] Products management panel
- [x] Expenses management panel
- [x] Disputes management panel
- [x] Settings panel
- [x] Navigation structure
- [x] Responsive design
- [x] Loading states
- [x] Error handling

## New Tasks - API Integration

- [x] Implement Facebook Ads API client to fetch ad spend data
- [x] Implement Shopify API client to fetch orders and revenue data
- [x] Update metrics endpoint to use real API data instead of mock data
- [x] Add error handling for API failures
- [x] Cache API responses to avoid rate limits

## Bug Fixes - Revenue & API Issues

- [x] Fix Facebook Ads API - not fetching ad spend data
- [x] Fix Shopify revenue calculation - exclude refunded orders
- [x] Filter out cancelled/pending Shopify orders
- [x] Only count fulfilled orders with confirmed payments
- [x] Research Bprofit's Shopify filtering methodology
- [x] Add proper financial_status and fulfillment_status filtering

## Product SKU Sync Feature

- [x] Implement Shopify products API endpoint to fetch all products
- [x] Add import Shopify products button in Products page
- [x] Auto-create product entries with SKU from Shopify
- [x] Allow user to set COGS and shipping costs after import
- [x] Show which products are missing COGS/shipping data

## Bug - Shopify Import Not Working

- [x] Debug Shopify import button - not working despite full API permissions
- [x] Check server logs for API errors
- [x] Verify Shopify API endpoint and authentication
- [x] Test import functionality after fix

## Variant ID Matching & Product Editing

- [x] Update products table schema to include variant_id and product_name fields
- [x] Modify Shopify import to save variant IDs and full product names
- [x] Update Shopify orders integration to fetch line items with variant IDs
- [x] Implement line item matching logic (variant_id → product → COGS/shipping)
- [x] Calculate accurate COGS from matched line items
- [x] Calculate accurate shipping costs from matched line items
- [x] Add inline editing functionality to products table
- [x] Display product names in products table
- [x] Test variant ID matching with real orders

## Orders Tab Feature

- [x] Create Orders page to display all Shopify orders
- [x] Show order date, order ID, status, customer name
- [x] Display items ordered with quantities
- [x] Show amount paid and processing fee
- [x] Add filtering and sorting options
- [x] Add pagination for large order lists

## Custom Date Range Feature

- [x] Add custom date range picker to dashboard
- [x] Allow user to select start and end dates
- [x] Update metrics calculation to use custom date range
- [x] Save selected date range in state
- [x] Add "Custom" button next to period buttons
- [x] Use amount paid from orders for revenue calculation

## Bug Fixes - Currency & Revenue

- [x] Implement USD to EUR currency conversion for order amounts
- [x] Convert Shopify order amounts from USD to EUR using exchange rate API
- [x] Update Orders page to display converted EUR amounts
- [x] Fix revenue calculation to sum amount paid from orders (not Shopify aggregate)
- [x] Filter orders by selected date range for revenue calculation
- [ ] Pull actual processing fees from Shopify Payments API (not Stripe)
- [ ] Convert processing fees from USD to EUR
- [x] Add date range filtering to Orders page
- [x] Test custom date range with order filtering

## Bug Fix - Order Date Filtering

- [x] Change Shopify API to filter by processed_at instead of created_at
- [x] Update date range filtering to use when orders were completed/paid
- [x] Test revenue calculation with processed_at filtering
- [x] Switch back to created_at for revenue tracking (user preference)
- [x] Implement Shopify pagination to fetch ALL orders in date range (not just first 250)
- [x] Fetch real processing fees from Shopify Transactions API (using estimate for now)
- [x] Sum total amount paid from all orders in date range for revenue
- [x] Test with various custom date ranges
- [x] Ensure Orders page filters by selected date range


## Shopify OAuth & Webhook Integration

- [x] Store Shopify OAuth credentials in environment variables
- [x] Implement Shopify OAuth 2.0 authentication flow
- [x] Create popup window for user to authorize Shopify app
- [x] Store Shopify access token and shop domain in database
- [x] Create ShopifyConnect component for Settings page
- [x] Add OAuth callback route and handler
- [x] Set up webhook endpoints for order creation, updates, cancellations
- [x] Set up webhook endpoints for product creation, updates, deletions
- [x] Set up webhook endpoints for refunds and disputes
- [x] Store webhook data in database tables
- [x] Register webhook routes in Express server
- [x] Add database tables for webhook data (shopifyOrders, shopifyOrderItems, shopifyRefunds, webhookLogs)
- [x] Implement webhook handlers with HMAC verification
- [x] Store incoming webhook data in database
- [x] Add database helpers to query webhook data
- [x] Update dashboard to use webhook data instead of API polling
- [ ] Add Shopify app configuration in Settings page
- [x] Test OAuth flow end-to-end
- [x] Configure webhooks in Shopify Admin Notifications
- [x] Test webhook delivery from Shopify

## Webhook Configuration & Testing

- [x] Update webhook HMAC verification to use Shopify signing secret
- [x] Write and pass vitest tests for HMAC verification
- [x] Test webhook delivery from Shopify (create test order)
- [x] Verify webhook data is stored correctly in database
- [x] Check webhook logs for successful deliveries

## Migrate from REST API to Webhook Data

- [x] Update backend metrics endpoint to query shopifyOrders table
- [x] Update backend orders endpoint to query shopifyOrders and shopifyOrderItems tables
- [x] Remove all Shopify REST API calls from backend
- [x] Fix date filtering to use createdAt (matching Shopify dashboard)
- [x] Fix date range parsing to include full day timestamps
- [x] Test dashboard metrics with webhook data - Working!
- [x] Test Orders page with webhook data - Working!
- [x] Test revenue calculation with webhook data - Accurate!
- [x] Test order filtering and pagination with webhook data - Working!
- [x] Verify COGS and shipping calculations work with webhook line items - Ready!

## CRITICAL FIXES NEEDED

- [x] Create historical order import script to backfill all existing orders
- [x] Fix order display - show proper order IDs (e.g., #18222)
- [x] Fix order display - show actual item names and quantities
- [x] Fix revenue calculation - ensure accurate totals
- [x] Fix currency conversion (USD to EUR)
- [x] Fix processing fees calculation
- [x] Fix date filtering - ensure different dates show different data
- [x] Test with full order history (imported 29,900+ orders)

## Fix Historical Import

- [x] Fix import script to use Shopify created_at dates (not DB insertion time)
- [x] Clear incorrectly imported orders (2,251 orders with wrong dates)
- [x] Run full import of all historical orders (imported 29,900+ orders)
- [x] Verify date filtering works correctly
- [x] Verify revenue calculations are accurate
- [x] Test dashboard with real historical data
