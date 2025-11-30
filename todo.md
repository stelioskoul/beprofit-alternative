# BeProfit Alternative - Multi-User SaaS TODO

## Phase 1: Database Schema & Planning
- [ ] Design complete database schema for multi-tenancy
- [ ] Document OAuth requirements for each platform
- [ ] Create migration files for all tables

## Phase 2: Database & Authentication
- [x] Create stores table (user's connected stores)
- [x] Create shopify_connections table
- [x] Create facebook_connections table
- [x] Create cogs_config table (per-store variant COGS)
- [x] Create shipping_config table (per-store shipping rules)
- [x] Create operational_expenses table (per-store expenses)
- [x] Create processing_fees_config table
- [x] Create exchange_rates table
- [x] Set up user authentication with Manus OAuth
- [x] Test database connections and auth flow

## Phase 3: OAuth Integrations
- [x] Implement Shopify OAuth flow (install, callback, token storage)
- [x] Implement Facebook OAuth flow (permissions, token exchange, refresh)
- [ ] Create OAuth management UI (connect/disconnect accounts)
- [ ] Handle token refresh logic for platforms
- [ ] Test OAuth flows end-to-end

## Future: TikTok Integration (Phase 2)
- [ ] Implement TikTok OAuth flow (advertiser access, token management)
- [ ] Add TikTok to connection management UI


## Phase 4: Business Logic Migration
- [x] Create tRPC procedures for Shopify data fetching
- [x] Create tRPC procedures for Facebook ad spend
- [x] Migrate COGS calculation logic (user-scoped)
- [x] Migrate shipping cost calculation logic (user-scoped)
- [x] Migrate operational expenses CRUD (user-scoped)
- [x] Implement profit calculation engine
- [x] Add timezone handling for multi-store support
- [x] Create stores CRUD procedures
- [x] Create config management procedures (COGS, shipping)
- [ ] Create API endpoints for metrics retrieval

## Phase 5: Dashboard UI
- [ ] Build landing page with login/signup
- [ ] Build main dashboard layout with navigation
- [ ] Build store management page (add/edit/delete stores)
- [ ] Build OAuth connection management page
- [ ] Build profit tracking dashboard (date range, metrics)
- [ ] Build COGS configuration UI (per variant)
- [ ] Build shipping configuration UI (tiered pricing)
- [ ] Build operational expenses management UI
- [ ] Build order details table view
- [ ] Add loading states and error handling
- [ ] Implement responsive design for mobile

## Phase 6: Testing & Deployment
- [ ] Write unit tests for tRPC procedures
- [ ] Test multi-user isolation (data security)
- [ ] Test OAuth flows with real accounts
- [ ] Test profit calculations with sample data
- [ ] Performance testing for large datasets
- [ ] Create deployment checkpoint

## Phase 7: Documentation & Delivery
- [ ] Write user setup guide (how to connect stores)
- [ ] Document OAuth app creation process
- [ ] Create admin guide for managing users
- [ ] Prepare deployment instructions
- [ ] Deliver final application to user


## Urgent Fixes (User Reported Issues)
- [ ] Fix Shopify OAuth connection - currently redirects to error page
- [ ] Fix Facebook OAuth connection - currently redirects to error page
- [ ] Clean up test stores from database (Test Store, Test Store 2)
- [ ] Investigate OAuth redirect URL configuration
- [ ] Compare OAuth flow with original working app
- [ ] Test OAuth with real credentials
- [ ] Consider implementing custom auth system instead of Manus OAuth (user preference)

## Critical OAuth Fix
- [ ] Fix OAuth redirect URL - currently using forge.manus.ai instead of production domain
- [ ] Add APP_URL environment variable for production domain
- [ ] Update OAuth URL generation to use APP_URL
- [ ] Test OAuth with production domain

## Store Access Error
- [ ] Fix "Store not found or access denied" error on connections page
- [ ] Check store-user associations in database
- [ ] Verify store access control logic in getById procedure

## Facebook OAuth Callback Error
- [ ] Fix "Facebook OAuth callback failed" error
- [ ] Check server logs for specific Facebook API error
- [ ] Verify Facebook app permissions and token exchange

## Hybrid Facebook Auth Implementation
- [ ] Add manual token entry UI to Connections page
- [ ] Create tRPC procedure for manual Facebook connection
- [ ] Add ad account ID input field
- [ ] Test manual connection with user's existing token
- [ ] Keep OAuth button for future use (after app approval)

## Shopify Manual Token & Partial Data Support
- [ ] Add manual Shopify token entry (like Facebook)
- [ ] Update dashboard to show partial data when only some connections exist
- [ ] Show ad spend when only Facebook is connected
- [ ] Show revenue when only Shopify is connected
- [ ] Handle zero values gracefully in UI
- [ ] Remove requirement for both connections to be present

## Beautiful Dark Theme Redesign
- [ ] Implement glass morphism effects on cards
- [ ] Add gold shiny texture for highlights/buttons/accents
- [ ] Update color scheme to dark theme with gold accents
- [ ] Add smooth animations and transitions
- [ ] Implement gradient backgrounds
- [ ] Polish typography and spacing

## Products Tab (COGS & Shipping Configuration)
- [ ] Create Products page that fetches all Shopify products
- [ ] Display products in a searchable/filterable table
- [ ] Add inline editing for COGS per variant
- [ ] Add shipping configuration per variant (like original app)
- [ ] Support country-based shipping rules
- [ ] Save configurations to database
- [ ] Show which products have/haven't been configured

## Operational Expenses Tab
- [ ] Create Expenses page with list view
- [ ] Add form to create new expense
- [ ] Support expense types: one-time, monthly, quarterly, yearly
- [ ] Add date range for recurring expenses
- [ ] Edit/delete existing expenses
- [ ] Show total expenses for current period
- [ ] Filter expenses by type/date range

## Orders Tab (Profit Breakdown)
- [ ] Create Orders page that fetches Shopify orders
- [ ] Display orders in table with date range filter
- [ ] Show line items for each order
- [ ] Calculate and display per-order metrics:
  * Total selling price
  * Total COGS
  * Total shipping cost
  * Processing fees
  * Net profit per order
- [ ] Color-code profitable vs unprofitable orders
- [ ] Add export functionality (CSV)
- [ ] Show order-level insights

## Navigation & Layout
- [ ] Update store view to have tabbed navigation
- [ ] Tabs: Dashboard, Products, Expenses, Orders, Connections
- [ ] Consistent layout across all tabs
- [ ] Breadcrumb navigation

## Map Error Fix (User Reported)
- [x] Fix "Cannot read properties of undefined (reading 'map')" error on /store/3
- [x] Check products.list procedure - ensure it returns array or empty array
- [x] Check orders.listWithProfit procedure - ensure it returns array or empty array
- [x] Add proper error handling and default values in frontend

## Orders Page Fixes (User Reported)
- [x] Fix invalid date display in Orders page
- [x] Add missing useAuth import
- [x] Improve date formatting with error handling
- [x] Product details already display (name, quantity, price, COGS, shipping, profit)

## Orders Page Issues (User Reported) - FIXED
- [x] Fix "Invalid date" display - added createdAt to ProcessedOrder interface
- [x] Show product line items in each order (product name, quantity)
- [x] Verify lineItems data is being fetched from Shopify correctly - enriched with calculated values
- [x] Update UI to display line items prominently - fixed field name mismatch (items vs lineItems)

## Currency Conversion Issues (User Reported - CRITICAL) - FIXED ✅
- [x] Investigate what currency Shopify returns prices in (confirmed: USD)
- [x] Investigate what currency Facebook returns ad spend in (confirmed: USD)
- [x] Fix Orders page - now converts USD prices to EUR correctly
- [x] Fix processing fees calculation - now in correct EUR currency
- [x] Implement live EUR/USD exchange rate fetching (using ExchangeRate-API)
- [x] Display current exchange rate in UI (top-right of Dashboard)
- [x] Convert all USD values to EUR before display
- [x] Ensure COGS and shipping costs are in correct currency

## Dashboard Date Range Picker (User Reported) - COMPLETED ✅
- [x] Add date range picker to Dashboard tab
- [x] Match the date picker style from Orders/Products tabs
- [x] Update metrics when date range changes (already working)
- [x] Set default to last 30 days (already set)

## Timezone Settings (User Requested) - COMPLETED ✅
- [x] Add timezone selector to Connections page
- [x] Store user's preferred timezone in database (timezoneOffset field)
- [x] Create update procedure for timezone changes
- [x] Show timezone selector with 25+ common timezones
- [x] Add helpful description for timezone usage

## UI Design Improvements (User Requested) - COMPLETED ✅
- [x] Add gradient background with gold texture effect and black
- [x] Make calendar icons gold color for visibility (showing as cyan, may need adjustment)
- [x] Improve overall visual aesthetics with gold accents

## Store Deletion Feature (User Requested) - COMPLETED ✅
- [x] Add delete button to store cards on home page
- [x] Implement double confirmation (two popups) to prevent accidental deletion
- [x] Test deletion flow end-to-end

## Advanced Operational Expenses (User Requested) - COMPLETED ✅
- [x] Add active/inactive status toggle for recurring expenses
- [x] For inactive expenses: add date range selector (from/to dates)
- [x] Calculate monthly/yearly expenses based on date range (backend logic ready)
- [x] For active expenses: only require start date, auto-calculate ongoing
- [x] Support both USD and EUR input (display in EUR)
- [x] Update expense calculation logic to handle active/inactive status

## Enhanced Product Configuration (User Requested)
- [ ] Support USD input for COGS (convert to EUR for display)
- [ ] Support USD input for shipping costs (convert to EUR for display)
- [ ] Add country-specific shipping: US, EU, CA
- [ ] Add shipping method variants: Standard, Express
- [ ] Add quantity-based shipping pricing (1pcs, 2pcs, 3pcs, 4pcs, etc.)
- [ ] Update database schema for complex shipping configuration
- [ ] Update profit calculator to use country/method/quantity shipping logic
- [ ] Create UI for managing shipping matrix per product

## UI Gradient Enhancement (User Feedback) - COMPLETED ✅
- [x] Make background gradient more stunning and visible
- [x] Add more prominent gold texture and shine effects
- [x] Reduce pure black, add more gold/amber tones
- [x] Create radial gradients with gold highlights

## Calendar Icon Styling Fix (User Reported) - COMPLETED ✅
- [x] Fix Orders tab calendar icons to be gold like Dashboard
- [x] Ensure all date pickers have consistent gold icon styling

## Advanced Product Shipping Configuration (Priority Feature) - IN PROGRESS 🚧
- [x] Design shipping matrix data structure (country x method x quantity)
- [x] Support three countries: US, EU, CA
- [x] Support two shipping methods per country: Standard, Express
- [x] Support quantity-based pricing (1pc, 2pcs, 3pcs, 4pcs, etc.)
- [x] Allow USD input for shipping costs (convert to EUR for display)
- [x] Build comprehensive shipping configuration UI
- [ ] Integrate shipping cost calculation into order profit logic (requires refactoring)
- [ ] Match order shipping method and destination to correct rate
- [ ] Calculate per-product shipping based on quantity in order

## Shipping Calculation Integration - COMPLETED ✅
- [x] Refactor profit calculator to use new shipping matrix logic
- [x] Load shipping configs from database for all variants
- [x] Update computeShippingForLineItem to support new config format (country/method/quantity)
- [x] Pass exchange rate to shipping calculation
- [x] Add currency support (USD/EUR) to shipping configs
- [x] Test with real orders to verify accuracy (7/7 tests passed)

## Logo Update (User Requested) - COMPLETED ✅
- [x] Copy new Profit Tracker logo to project
- [x] Replace BeProfit text/logo with new logo image
- [x] Update logo in header/navigation (Dashboard and Home pages)
- [x] Ensure logo is responsive and looks good on all screen sizes

## Gradient Background Fix (User Reported - CRITICAL) - COMPLETED ✅
- [x] Fix gradient not visible in main app (removed bg-background from all pages)
- [x] Make gradient visible throughout entire app
- [x] Add stunning dark gold gradient effect (increased opacity to 25%, 22%, 20%)
- [x] Implement slow breathing animation for gradient (8s ease-in-out)
- [x] Ensure gradient doesn't get covered by app containers

## Logo Size Increase (User Requested) - COMPLETED ✅
- [x] Make logo bigger in header (increased from h-10 to h-14)
- [x] Ensure logo looks good at larger size on all screen sizes

## Gold Button Texture Enhancement (User Requested) - COMPLETED ✅
- [x] Replace flat dark yellow buttons with realistic gold texture
- [x] Add metallic shine effect to gold buttons (inset shadows, multi-layer gradient)
- [x] Implement animated shine/shimmer effect (3s infinite animation)
- [x] Apply to all gold buttons throughout the app (gold-gradient class)

## Logout Button (User Requested) - COMPLETED ✅
- [x] Add logout button to header/navigation
- [x] Implement logout functionality using trpc.auth.logout
- [x] Position near user name in header
- [x] Style consistently with app design (outline variant)

## Apply Gold Gradient to Buttons (User Reported - Missing) - COMPLETED ✅
- [x] Apply gold-gradient class to "Add Store" button in Dashboard
- [x] Apply gold-gradient class to "Get Started" button in Home page
- [x] Apply gold-gradient class to "Sign In" button in Home page
- [x] Other action buttons already have gold-gradient applied

## VariantId Type Mismatch Error (User Reported - CRITICAL) - FIXED ✅
- [x] Find where variantId is being passed as number instead of string (Products.tsx line 180, 187, 211, 213, 217)
- [x] Fix type conversion in Products page COGS/shipping save (added .toString())
- [x] Ensure all variantId values are converted to strings before API calls
- [x] Test COGS and shipping configuration saves
