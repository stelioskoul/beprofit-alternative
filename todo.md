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
