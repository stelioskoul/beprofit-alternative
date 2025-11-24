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
