# Shopify Balance Transactions Extraction Logic

## Overview
We fetch processing fees and dispute data directly from Shopify's Balance Transactions API (`/admin/api/2025-10/shopify_payments/balance/transactions.json`).

## Transaction Types We Process

### 1. Processing Fees (Type: "charge")

**What we extract:**
- Transaction type: `"charge"`
- Source type filter: `"Order"` (ONLY)
- Fee field: `txn.fee` (in EUR)
- Order reference: `txn.source_order_id`

**Logic:**
```typescript
if (txn.type === "charge" && txn.source_order_id && txn.source_type === "Order") {
  const feeEur = parseFloat(txn.fee);
  const feeUsd = feeEur * eurToUsdRate; // Convert EUR to USD
  orderFees.set(orderId, existingFee + feeUsd); // Accumulate if multiple charges
}
```

**Why we filter by `source_type === "Order"`:**
- Excludes refund-related charges (source_type: "Refund")
- Excludes adjustment charges
- Ensures we only count actual order processing fees

**Why we accumulate:**
- Some orders may have multiple payment captures (partial captures, split payments)
- Each capture has its own processing fee
- Total fee = sum of all Order-type charge fees

---

### 2. Dispute Value (Type: "chargeback" or "dispute")

**What we extract:**
- Transaction type: `"chargeback"` OR `"dispute"`
- Amount field: `txn.amount` (in EUR) - **This is the chargeback amount (money taken back)**
- Fee field: `txn.fee` (in EUR) - **This is the dispute fee charged by Shopify**

**Logic:**
```typescript
if (txn.type === "chargeback" || txn.type === "dispute") {
  const amountEur = Math.abs(parseFloat(txn.amount)); // Chargeback amount
  const feeEur = Math.abs(parseFloat(txn.fee));       // Dispute fee
  
  totalDisputeValue += amountEur * eurToUsdRate; // Convert to USD
  totalDisputeFees += feeEur * eurToUsdRate;     // Convert to USD
}
```

**Separation in Dashboard:**
- **Dispute Value**: The actual money lost from chargebacks (`txn.amount`)
- **Dispute Fees**: The fees Shopify charges for handling disputes (`txn.fee`)
- Both are separate line items in the cost breakdown
- Both are included in net profit calculation

---

## Currency Conversion

All balance transaction amounts are returned in **EUR** by Shopify.

We convert to **USD** using the live EUR/USD exchange rate:
```typescript
const EXCHANGE_RATE_EUR_USD = await getEurUsdRate(); // Fetches live rate
const feeUsd = feeEur * EXCHANGE_RATE_EUR_USD;
```

---

## Date Filtering

Balance transactions are filtered by `processed_at` timestamp:
```typescript
const txnDate = new Date(txn.processed_at);
const fromDate = new Date(dateRange.fromDate);
const toDate = new Date(dateRange.toDate);
toDate.setHours(23, 59, 59, 999); // Include entire "to" date

if (txnDate < fromDate || txnDate > toDate) {
  continue; // Skip transactions outside date range
}
```

---

## Summary

### Processing Fees
✅ Extracted from `type === "charge"` transactions  
✅ Filtered to `source_type === "Order"` only  
✅ Uses `txn.fee` field  
✅ Converted from EUR to USD  
✅ Accumulated per order (for multiple captures)  
❌ NOT including dispute fees (separate tracking)

### Dispute Value
✅ Extracted from `type === "chargeback"` or `"dispute"` transactions  
✅ Uses `txn.amount` field for chargeback amount  
✅ Converted from EUR to USD  
✅ Displayed separately in dashboard

### Dispute Fees
✅ Extracted from `type === "chargeback"` or `"dispute"` transactions  
✅ Uses `txn.fee` field for dispute handling fee  
✅ Converted from EUR to USD  
✅ Displayed separately in dashboard  
❌ NOT included in processing fees

---

## Verification

To verify this matches Shopify:

1. **For Processing Fees:**
   - Go to Shopify Admin → Finances → Payouts → Transactions
   - Filter by order number
   - Look for "Charge" transactions with source "Order"
   - Sum the "Fee" column (should match our app)

2. **For Disputes:**
   - Go to Shopify Admin → Finances → Payouts → Transactions
   - Look for "Chargeback" or "Dispute" transactions
   - "Amount" = Dispute Value
   - "Fee" = Dispute Fee
   - Both should match our dashboard breakdown
