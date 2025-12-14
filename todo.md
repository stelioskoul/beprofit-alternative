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
