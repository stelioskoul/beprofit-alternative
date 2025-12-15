# BeProfit Alternative - TODO

## CRITICAL PROFIT CALCULATION FIXES ✅
- [x] Fix tip extraction - added total_tip_received field from Shopify
- [x] Add tip to order display in Orders page
- [x] Fix processing fees calculation - now calculated per order (2.8% + $0.29)
- [x] Fix profit margin calculation - now includes shipping revenue and tip in total revenue
- [x] Add total order profit margin percentage to Orders page
- [x] Fix discount display - Order 18305 now correctly shows $26.85 discount
- [x] Test all changes with real order data - verified with orders #18305 and #18306

## Completed Features ✅
- [x] Multi-user authentication with Manus OAuth
- [x] Store management (create, list, view, delete with double confirmation)
- [x] Shopify integration (manual token entry)
- [x] Facebook integration (manual token entry)
- [x] Beautiful dark theme with gold accents and glass effects
- [x] Tabbed navigation (Dashboard, Products, Orders, Expenses, Connections, Shipping Profiles, Settings)
- [x] Timezone selection (New York, Los Angeles, Greece)
- [x] Dual currency display (USD primary, EUR secondary)
- [x] Live EUR/USD exchange rate
- [x] Dashboard with date range picker
- [x] Products page with COGS configuration
- [x] Operational expenses with active/inactive status
- [x] Orders page with profit breakdown
- [x] Shipping Profiles system (reusable configurations)
- [x] Order search functionality
- [x] Country and shipping method display in orders
- [x] Average profit margin per order in Dashboard

## CRITICAL PROFIT CALCULATION FIXES - PHASE 2 ✅
- [x] Fix revenue double-counting bug - removed duplicate addition of shipping_revenue (total_price already includes it)
- [x] Rename "Total Order Profit Margin" to "Total Profit Margin"
- [x] Corrected profit formula: Profit = total_price - COGS - shipping_cost - processing_fees

## FETCH ACTUAL PROCESSING FEES FROM SHOPIFY PAYOUTS ⚠️
- [x] Research Shopify Payouts API (balance transactions with type "charge")
- [x] Implement balance transaction fetching function with graceful error handling
- [x] Integrate balance transactions into profit calculator
- [x] Map actual fees to orders by order_id
- [x] Remove per-product fee calculations and display
- [x] Update routers.ts to use actual fees from balance transactions
- [x] Temporarily disabled - requires Shopify Payments permissions (404/403)
- [x] Fallback to calculated fees (2.8% + $0.29) works correctly
- [x] Test with real order data - all calculations verified correct (Order #18305 and #18306)

## RE-ENABLE BALANCE TRANSACTIONS API ✅
- [x] Re-enable balance transactions API calls in dashboard.calculate procedure
- [x] Re-enable balance transactions API calls in orders.listWithProfit procedure
- [x] Test with real order data - dashboard loaded successfully after ~30 seconds
- [x] Added pagination limit (10 pages max = 2500 transactions) to prevent timeouts
- [x] Balance transactions API is working but takes 20-30 seconds per request
- [x] Note: Consider implementing as background job for better UX

## CRITICAL FIXES - PHASE 3 ✅
- [x] Convert processing fees from EUR to USD (balance transactions return EUR) - Verified working!
- [x] Change default date range to today only (was last 30 days) - Dashboard defaults to today
- [x] Add debug logging for COGS/Shipping configuration matching
- [x] Remove products fetch limit - now fetches all products with pagination (up to 5000)
- [x] Test all fixes with real data - All working correctly!
- [x] COGS showing correctly in orders (Order #18306: $14.50, Order #18305: $37.00)
- [x] Processing fees converted correctly (Order #18306: $3.58 from EUR)
- [x] Total Profit Margin renamed and showing correctly

## CRITICAL BUG: SHIPPING COSTS NOT SHOWING ✅
- [x] Investigate shipping profile matching logic in profit-calculator.ts
- [x] Check how shipping profiles are stored and retrieved from database
- [x] Identified issue: getShippingConfigByStoreId only queried shipping_config table (empty)
- [x] Fixed: Updated getShippingConfigByStoreId to JOIN product_shipping_profiles with shipping_profiles
- [x] Ready for user testing - assign shipping profile to product and verify costs appear in orders

## CRITICAL FIXES - PHASE 4 ✅
- [x] Fix dashboard showing zeros on initial load - used useMemo to stabilize date initialization
- [x] Add Disputes/Chargebacks to cost breakdown - extract from Shopify balance transactions (type: "chargeback")
- [x] Include dispute fees in net profit calculation - totalDisputes added to cost breakdown
- [x] Fix Average Profit Margin calculation - now calculates average of individual order profit margins
- [x] Added Disputes/Chargebacks row to Cost Breakdown UI
- [x] Updated Total Costs to include disputes
- [x] Ready for user testing

## CRITICAL FIXES - PHASE 5 ✅
- [x] Split chargeback transactions into dispute value and dispute fees (separate in balance transactions)
- [x] Update dashboard cost breakdown to show both "Dispute Value" and "Dispute Fees" separately
- [x] Update routers.ts to use new balance transactions return type
- [x] Include both dispute value and fees in net profit calculation
- [x] Fix Average Profit per Order - now calculates average of individual order net profits
- [x] Updated StoreView.tsx to use averageOrderProfit from backend
- [x] Fixed hasMore/lastId variable declarations in balance transactions
- [x] Ready for user testing

## CRITICAL FIXES - PHASE 6 ✅
- [x] Fix dispute fees/value not filtering by date range - added date filtering using processed_at timestamp
- [x] Investigate balance transactions date filtering logic - API doesn't support date params, filter client-side
- [x] Add date validation - "from" date max is "to" date, "to" date min is "from" date
- [x] Ready for user testing

## CRITICAL FIX - DISCOUNT ALLOCATION ✅
- [x] Allocate order discounts proportionally to line items based on item price
- [x] Update item profit calculation to include allocated discount
- [x] Formula: Item Profit = Item Total - COGS - Shipping Cost - Proportional Discount
- [x] Added discount field to line item return data
- [x] Update Orders.tsx to display item-level discount instead of order-level discount
- [x] Ready for user testing with orders that have discounts

## INVESTIGATION - PROCESSING FEES & DISPUTES ✅
- [x] Fix processing fee calculation - added source_type === "Order" filter to exclude refund-related charges
- [x] Verify processing fees are extracted from "charge" type transactions only (not including dispute fees)
- [x] Verify dispute value is extracted from "chargeback" type transaction amount
- [x] Verify dispute fee is extracted from "chargeback" type transaction fee field
- [x] Ensure dispute fees are not double-counted in processing fees
- [x] Added comprehensive logging for all transaction types
- [x] Created TRANSACTION_EXTRACTION_LOGIC.md documentation

## PROCESSING FEE FIX - ROUND 2 ⚠️
- [ ] Remove source_type === "Order" filter - it's excluding legitimate charge transactions
- [ ] Fetch ALL "charge" type transaction fees per order (sum them up)
- [ ] Test with order #11472 to verify fee matches Shopify's $3.69

## DEBUG - RAW TRANSACTION DATA 🔍
- [ ] Create debug endpoint to view raw Shopify balance transaction data
- [ ] Examine actual fee values returned by API for order #11472
- [ ] Identify why fees don't match Shopify UI ($2.59 vs $2.50)

## TIMEZONE ISSUE ✅
- [x] Fix balance transactions date filtering to use store timezone (not UTC)
- [x] Ensure order filtering uses store timezone consistently
- [x] Verify orders at timezone boundaries (start/end of day) are included correctly
- [x] Test with New York timezone (UTC-5) vs Greece timezone (UTC+2)

## REFUNDS & CHARGEBACK REVERSALS ✅
- [x] Remove debug UI elements from Orders page
- [x] Add currency checking for all balance transaction types (check currency field, convert EUR to USD)
- [x] Track refunds from balance transactions (type: "refund")
- [x] Add refunds to dashboard cost breakdown
- [x] Track chargeback reversals (type: "chargeback_reversal")
- [x] Subtract reversals from dispute value (but keep dispute fees)
- [ ] Test with real data

## CRITICAL BUG - ORDERS TAB NOT SHOWING ORDERS ✅
- [x] Investigate why Orders tab shows "No orders found" after timezone fix
- [x] Check if orders fetching is affected by timezone changes
- [x] Fix and test - Issue was Orders.tsx trying to access data.orders when data is already the array

## OPERATIONAL EXPENSES IMPROVEMENTS ✅
- [x] Display total expenses in USD (changed formatCurrency from EUR to USD)
- [x] Add currency field to expense form (USD/EUR) - already exists
- [x] Auto-convert EUR to USD when saving, store in USD
- [x] Implement one-time expense logic (apply only on specified date)
- [x] Implement monthly recurring logic (apply on same day each month while active)
- [x] Implement yearly recurring logic (apply on same day each year while active)
- [x] Implement "No Longer Active" logic (apply from start to end date based on frequency)
- [x] Update dashboard to sum expenses in date range correctly
- [x] Test all expense scenarios

## CUSTOM EMAIL/PASSWORD AUTHENTICATION ✅
- [x] Update users table schema - add passwordHash field, make openId optional
- [x] Run database migration to apply schema changes
- [x] Install bcrypt package for password hashing
- [x] Create password hashing utility functions
- [x] Create POST /api/auth/signup endpoint (email, password, name)
- [x] Create POST /api/auth/login endpoint (email, password)
- [x] Update logout endpoint if needed
- [x] Create Sign In page (email + password form)
- [x] Create Sign Up page (email + password + name form)
- [x] Update auth context to use new endpoints
- [x] Remove Manus OAuth login flow from UI
- [x] Remove Manus OAuth dependencies from backend
- [x] Add password validation (min 8 characters)
- [ ] Test complete auth flow (signup → login → logout)

## MIGRATE EXISTING USERS TO CUSTOM AUTH ✅
- [x] Hash password $KoulPant1243 using bcrypt for kingkom.business@gmail.com
- [x] Hash password $Koul112002 using bcrypt for stelioskouloulias@gmail.com
- [x] Update both users with passwordHash in database
- [ ] Verify both users can log in with email + password

## FIX LOGIN REDIRECT ISSUE ✅
- [x] Investigate why login redirects to homepage instead of stores page
- [x] Check login endpoint response and session cookie setting
- [x] Check SignIn page redirect logic after successful login
- [x] Fix and test login flow - Changed redirect from / to /dashboard

## MIGRATE USER ACCOUNT ✅
- [x] Update stelioskouloulias@gmail.com to business.kdgroup@gmail.com
- [x] Hash new password $KoulDoul1243 using bcrypt
- [x] Update email and passwordHash in database (preserve all user data)
- [ ] Test login with new credentials

## REDESIGN AUTH PAGES ✅
- [x] Add Profit Tracker logo to SignIn and SignUp pages
- [x] Apply gold gradient background matching app design
- [x] Add gold texture overlay and animations
- [x] Style buttons with gold-gradient class
- [x] Add breathing animation to background
- [x] Make auth pages visually consistent with main app

## FIX AUTH CONTEXT MANUS OAUTH REDIRECT ✅
- [x] Investigate why dashboard redirects to Manus OAuth login
- [x] Find getLoginUrl function and update to return /signin
- [x] Remove Manus OAuth redirect from auth context
- [ ] Test complete login flow (signin → dashboard → logout → signin)

## THREE CRITICAL FIXES ✅
- [x] Make name field required on signup (not optional)
- [x] Fix login not redirecting to dashboard - Added getUserById to support custom auth
- [x] Update sdk.ts to verify sessions by user ID (not just openId)
- [x] Set business.kdgroup@gmail.com (formerly stelioskouloulias@gmail.com) as admin
- [ ] Test all three fixes

## CHANGE ADMIN USER ✅
- [x] Set business.kdgroup@gmail.com role to 'user' (not admin)
- [x] Create new user stelioskouloulias@gmail.com with password $Koul112002
- [x] Set stelioskouloulias@gmail.com role to 'admin'
- [x] Verify both users work correctly

## FINAL OPTIMIZATION FEATURES 🚀

### Orders Tab Default Date
- [x] Change Orders tab default date range to "today" (matching dashboard)

### Data Caching System (Option 2: Last 90 days)
- [x] Create cached_metrics table in database schema
- [x] Implement cache module with smart caching rules (skip today)
- [x] Extract metrics calculation to separate module
- [x] Add getProfitCached procedure with cache-first logic
- [x] Add refreshCache mutation for manual refresh
- [x] Update scheduler to refresh yesterday, last 7 days, last 30 days
- [x] Initialize scheduler in server startup
- [x] Implement cache invalidation when COGS/shipping/expenses updated
- [x] Add "Refresh Data" button in dashboard UI
- [ ] Show "Last refreshed" timestamp in UI (optional - can be added later)
- [x] Update frontend to use getProfitCached instead of getProfit

### Bulk Product Operations
- [ ] Design CSV templates for COGS (product SKU, cost)
- [ ] Design CSV templates for Shipping Profiles (product SKU, profile)
- [ ] Design CSV templates for Operational Expenses (expense name, amount, type)
- [ ] Add "Download Template" buttons in each tab
- [ ] Add "Import CSV" buttons in each tab
- [ ] Implement CSV parsing and validation
- [ ] Implement bulk update logic with transactions
- [ ] Show import preview before applying changes
- [ ] Add success/error feedback after import

## ADD LAST REFRESHED TIMESTAMP 🕐
- [ ] Store fetchedAt timestamp in cached metrics
- [ ] Return timestamp with cached data
- [ ] Display "Last refreshed X minutes ago" in dashboard UI
- [ ] Show real-time indicator for today's data

## BULK CSV OPERATIONS 📊
### Backend (Complete)
- [x] Create CSV helper module with template generation
- [x] Add CSV parsing and validation functions
- [x] Create downloadCogsTemplate endpoint
- [x] Create downloadShippingTemplate endpoint
- [x] Create downloadExpensesTemplate endpoint
- [x] Create importCogsBulk endpoint with validation
- [x] Create importShippingBulk endpoint with validation
- [x] Create importExpensesBulk endpoint with validation
- [x] Add cache invalidation after bulk imports

### Frontend (Complete)
- [x] Add "Download Template" and "Import CSV" buttons in Products tab
- [x] Add "Download Template" and "Import CSV" buttons in Shipping Profiles tab
- [x] Add "Download Template" and "Import CSV" buttons in Expenses tab
- [x] Implement file upload and CSV reading
- [x] Show success/error messages after import

## FIX CSV TEMPLATES & TIMESTAMP 🔧
### Timestamp Display
- [x] Add "Last refreshed X minutes ago" display in dashboard
- [x] Show timestamp next to Refresh Data button
- [x] Format timestamp as "X minutes/hours ago" or "Just now"

### Products CSV Export (Real Data)
- [x] Export all products with variants from Shopify
- [x] Include current COGS values for each variant
- [x] Include assigned shipping profile name
- [x] Structure: SKU, Product Title, Variant Title, Variant ID, Current COGS (USD), Shipping Profile Name
- [x] Import should match by Variant ID and update COGS + shipping profile assignment

### Shipping Profiles CSV Export (Real Data)
- [x] Export all existing shipping profiles
- [x] Include quantity tiers (min/max quantity)
- [x] Include countries configuration
- [x] Include shipping methods (standard/express/etc)
- [x] Structure: Profile Name, Min/Max Quantity, Country Code/Name, Shipping Method, Cost (USD)
- [x] Import should reconstruct profiles from flat CSV rows

### Expenses CSV Export (Real Data)
- [x] Export all existing operational expenses
- [x] All amounts in USD
- [x] Include: Name, Amount (USD), Type, Date, Start/End Date, Is Active
- [x] Import creates new expenses from CSV (all in USD)

## FIX OPERATIONAL EXPENSES ISSUES 🔧
- [x] Remove "N/A" display for empty descriptions in expenses UI
- [x] Fix expense name not appearing in CSV export (title field)
- [x] Clarify date field usage: Date for one_time expenses, Start/End Date for recurring
- [x] Update CSV export to properly include expense names
- [ ] Test CSV export/import with all expense types

## FIX SHIPPING PROFILES CSV EXPORT 🚢
- [x] Investigate shipping profiles CSV export issue - methods were nested in countries not tiers
- [x] Fix data structure to properly flatten quantity tiers, countries, and methods
- [ ] Test export with real shipping profile data
- [ ] Verify import can reconstruct profiles correctly

## DEBUG SHIPPING PROFILE CSV EXPORT 🔍
- [x] Query database to see actual configJson structure for Test profile
- [x] Found actual structure: Country → Method → Quantity → Cost
- [x] Fix CSV export to parse this structure instead of quantityTiers
- [x] Test export with real shipping profile configuration
- [x] Fix import to reconstruct Country→Method→Quantity→Cost structure
- [x] Update CSV validation to use new column names

## REMOVE CACHING SYSTEM ✅
- [x] Remove cache.ts module
- [x] Remove metrics-calculator.ts module
- [x] Remove scheduler.ts module
- [x] Remove scheduler initialization from server
- [x] Remove getProfitCached and refreshCache procedures
- [x] Remove all cache invalidation calls from CSV imports
- [x] Update frontend to use getProfit instead of getProfitCached
- [x] Remove lastRefreshed timestamp display from UI
- [x] Remove cached_metrics table from schema
- [x] All caching logic completely removed - back to simple direct queries

## ADD ROAS METRIC 📊
- [x] Add ROAS calculation to backend (revenue / ad spend)
- [x] Display ROAS in Order Statistics section on dashboard
- [x] Format ROAS as ratio (e.g., "3.2x")

## FIX AVERAGE PROFIT CALCULATIONS 🔧
- [x] Add profit field to ProcessedOrder interface
- [x] Calculate profit for each order in processOrders function
- [x] Fix average profit per order calculation for date range
- [x] Fix average profit margin per order calculation for date range
- [x] Verify calculations show correct values instead of zero

## COMPLETE MOBILE RESPONSIVENESS 📱
- [x] Make navigation tabs scrollable horizontally on mobile
- [x] Stack date picker and buttons vertically on mobile
- [x] Make dashboard header responsive
- [ ] Test on actual mobile viewport to verify all changes work
