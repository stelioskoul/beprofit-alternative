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
