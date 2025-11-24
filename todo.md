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

## Currency Display & Real Transaction Fees

- [x] Fix Orders page to display USD amounts with $ sign (not €)
- [x] Update dashboard Revenue to show both USD and EUR amounts
- [x] Display conversion with arrow (→) on dashboard
- [x] Ensure all profit calculations use EUR converted amounts
- [x] Test with today's data to verify accuracy

## Processing Fees from Payouts API

- [x] Remove Processing Fee column from Orders page
- [x] Implement Shopify Payouts API client (GraphQL)
- [x] Fetch payout fees for selected date range
- [x] Add Processing Fees metric card to Dashboard
- [x] Update profit calculations to subtract payout fees
- [x] Test with different time periods (today, yesterday, this month) - All working!
- [x] Verify Shopify OAuth access token is stored correctly

## Tiered COGS & Shipping System

- [x] Update products table schema to support tiered pricing (JSON columns)
- [x] Add cogsTiers field: { "1": price, "2": price, "3": price, "4+": price }
- [x] Add shippingTiers field: { "EU": { "1": price, "2": price, ... }, "USA": {...}, "Canada": {...} }
- [ ] Create UI in Products page to configure COGS tiers (deferred)
- [ ] Create UI in Products page to configure shipping zones and tiers (deferred)
- [ ] Add region/zone selector (EU, USA, Canada, Rest of World) (deferred)
- [x] Implement automatic order matching (variant ID → product)
- [x] Extract quantity from order line items
- [x] Extract shipping country/region from order data
- [x] Calculate COGS based on quantity tier
- [x] Calculate shipping based on quantity tier and region
- [x] Update metrics endpoint to use calculated COGS and shipping
- [ ] Configure product tiers manually (next step)
- [ ] Test with real orders containing different quantities
- [ ] Test with orders from different regions
- [ ] Verify dashboard shows accurate COGS and shipping totals

## Products UI Redesign for Tiered Pricing

- [x] Update Shopify product import to use variant ID (not SKU)
- [x] Store product name from Shopify
- [x] Update products table to use variantId as primary identifier
- [x] Make SKU optional in schema
- [x] Update backend to support variant ID-based products
- [ ] Create new Products UI with expandable product cards (deferred)
- [ ] Add COGS tier input fields (1, 2, 3, 4+ items) (deferred)
- [ ] Add shipping zone tabs (EU, USA, Canada, ROW) (deferred)
- [ ] Add shipping tier inputs for each zone (1, 2, 3, 4+ items) (deferred)
- [ ] Implement save functionality for tier configurations (deferred)
- [ ] Test import from Shopify
- [ ] Test tier configuration and saving

## Remove Shopify OAuth & Build Tiered Pricing UI

- [x] Remove ShopifyConnect component from Settings page
- [x] Remove unused Shopify OAuth code
- [x] Design tiered pricing UI with expandable product cards
- [x] Add COGS tier input fields (1, 2, 3, 4+ items)
- [x] Add shipping zone tabs (EU, USA, Canada, ROW)
- [x] Add shipping tier inputs for each zone (1, 2, 3, 4+ items)
- [x] Implement save functionality for tier configurations
- [x] Add validation for tier pricing inputs
- [x] Test tier configuration UI
- [x] Verify tier data saves to database correctly
- [x] Write and pass unit tests for updateTiers procedure

## Implement Tiered Profit Calculation System

- [ ] Create helper function to map shipping country to zone (EU/USA/Canada/ROW)
- [ ] Create helper function to look up COGS tier based on quantity
- [ ] Create helper function to look up shipping tier based on zone and quantity
- [ ] Update profit calculation to use tiered COGS per line item
- [ ] Update profit calculation to use tiered shipping per line item
- [ ] Aggregate all line items correctly for total order cost
- [ ] Update dashboard analytics queries to use new calculation
- [ ] Handle products without tier configuration (fallback to flat rates)
- [ ] Write unit tests for tier lookup functions
- [ ] Test with real order data on dashboard

## Simplify COGS to Flat Rate (Remove Tiers)

- [x] Remove cogsTiers column from products table schema
- [x] Update tiered-pricing.ts to use flat COGS × quantity
- [x] Update Products page UI to show single COGS input instead of 4 tiers
- [x] Update updateTiers procedure to accept cogs and shippingTiers
- [x] Update database helper functions
- [x] Test flat COGS calculation with real orders
- [x] Update unit tests for new calculation logic
- [x] Verify dashboard shows correct COGS totals

## Critical Fixes - Orders & Revenue

### Orders Tab Not Updating
- [x] Investigate Orders tab query/filter logic (found 30-day default filter)
- [x] Check if Orders page has date range filter causing issue (yes, defaulted to last 30 days)
- [x] Fix Orders tab to show all newly imported orders (removed default date filter)
- [x] Test Orders tab displays all orders correctly (17,211 orders loading fast with pagination)

### Revenue Accuracy
- [x] Verify Shopify order timestamps are in UTC (confirmed)
- [x] Check dashboard timezone handling for revenue calculations (fixed to use UTC)
- [x] Fix timezone mismatch in orders and metrics queries (added 'Z' suffix for UTC)
- [x] Add database-level pagination to prevent memory issues
- [x] Test revenue accuracy across different time periods (TODAY showing correct data)

## Medium Priority Features

### Products Page Layout
- [x] Add left margin to Products page main content
- [x] Test Products page displays correctly next to sidebar
- [x] Fix vertical spacing - reduce top padding so products appear higher on page (changed py-8 to pt-4 pb-8)

### Manual Product Management
- [x] Add "Create Product" button and modal form
- [x] Implement createProduct tRPC procedure (already exists)
- [x] Add delete icon button for each product
- [x] Implement deleteProduct tRPC procedure with confirmation dialog (already exists)
- [x] Test product creation and deletion (UI working correctly)

### Disputes Auto-Pull
- [x] Research Shopify Disputes API endpoint and authentication (GET /admin/api/latest/shopify_payments/disputes.json)
- [ ] Add "Pull Disputes" button in Disputes page with date range selector
- [ ] Implement Shopify Disputes API integration
- [ ] Create pullDisputes tRPC procedure
- [x] Store dispute data in database (created shopifyDisputes table)
- [ ] Display disputes in Disputes page
- [ ] Integrate disputes into profit calculations
- [ ] Test disputes auto-pull functionality

### Shopify OAuth in Settings
- [ ] Add "Connect Shopify" button in Settings page
- [ ] Implement OAuth redirect URL handling
- [ ] Store Shopify access token securely
- [ ] Auto-register webhooks after OAuth success
- [ ] Test OAuth flow and webhook registration
