/**
 * Shopify data fetching utilities
 * Migrated from original Netlify functions
 */

interface DateRange {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
}

interface ShopifyOrder {
  id: string;
  order_number: number;
  created_at: string;
  total_price: string;
  currency: string;
  customer?: {
    first_name?: string;
    last_name?: string;
  };
  line_items: any[];
  shipping_address?: {
    country?: string;
  };
  shipping_lines: any[];
}

function offsetToTzString(offsetMinutes: number): string {
  const sign = offsetMinutes <= 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

export async function fetchShopifyOrders(
  shopDomain: string,
  accessToken: string,
  dateRange: DateRange,
  timezoneOffset: number = -300,
  apiVersion: string = "2025-10"
): Promise<ShopifyOrder[]> {
  const tz = offsetToTzString(timezoneOffset);
  const createdMin = `${dateRange.fromDate}T00:00:00${tz}`;
  const createdMax = `${dateRange.toDate}T23:59:59${tz}`;

  const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json`;

  const orders: ShopifyOrder[] = [];
  let nextPageInfo: string | null = null;
  let safety = 0;

  while (true) {
    const url = new URL(baseUrl);

    if (nextPageInfo) {
      url.searchParams.set("page_info", nextPageInfo);
      url.searchParams.set("limit", "250");
    } else {
      url.searchParams.set("status", "any");
      url.searchParams.set("limit", "250");
      url.searchParams.set("created_at_min", createdMin);
      url.searchParams.set("created_at_max", createdMax);
      url.searchParams.set(
        "fields",
        "id,order_number,created_at,total_price,currency,customer,line_items,shipping_address,shipping_lines,total_discounts,total_tip_received,current_total_discounts_set,financial_status"
      );
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify Orders API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const list = data.orders || [];
    if (!list.length) break;

    orders.push(...list);

    const linkHeader = res.headers.get("link") || res.headers.get("Link");
    if (!linkHeader) break;
    const parts = linkHeader.split(",");
    const nextPart = parts.find((p) => p.includes('rel="next"'));
    if (!nextPart) break;
    const match = nextPart.match(/<([^>]+)>/);
    if (!match) break;
    const nextUrl = new URL(match[1]);
    const pageInfo = nextUrl.searchParams.get("page_info");
    if (!pageInfo) break;
    nextPageInfo = pageInfo;

    safety++;
    if (safety > 60) break;
  }

  return orders;
}

export async function fetchShopifyDisputes(
  shopDomain: string,
  accessToken: string,
  dateRange: DateRange,
  timezoneOffset: number = -300,
  apiVersion: string = "2025-10"
): Promise<{ totalAmount: number; count: number }> {
  const tz = offsetToTzString(timezoneOffset);
  const initiatedMin = `${dateRange.fromDate}T00:00:00${tz}`;
  const initiatedMax = `${dateRange.toDate}T23:59:59${tz}`;

  const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/shopify_payments/disputes.json`;

  let totalAmount = 0;
  let totalCount = 0;
  let nextPageInfo: string | null = null;
  let safety = 0;

  while (true) {
    const url = new URL(baseUrl);

    if (nextPageInfo) {
      url.searchParams.set("page_info", nextPageInfo);
      url.searchParams.set("limit", "250");
    } else {
      url.searchParams.set("status", "lost");
      url.searchParams.set("limit", "250");
      url.searchParams.set("initiated_at_min", initiatedMin);
      url.searchParams.set("initiated_at_max", initiatedMax);
      url.searchParams.set("fields", "id,amount,currency,status");
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        // Disputes endpoint not available (not using Shopify Payments)
        return { totalAmount: 0, count: 0 };
      }
      const text = await res.text();
      throw new Error(`Shopify Disputes API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const list = data.disputes || [];
    if (!list.length) break;

    for (const dispute of list) {
      const val = parseFloat(dispute.amount || "0");
      if (!isNaN(val)) {
        totalAmount += val;
      }
      totalCount++;
    }

    const linkHeader = res.headers.get("link") || res.headers.get("Link");
    if (!linkHeader) break;
    const parts = linkHeader.split(",");
    const nextPart = parts.find((p) => p.includes('rel="next"'));
    if (!nextPart) break;
    const match = nextPart.match(/<([^>]+)>/);
    if (!match) break;
    const nextUrl = new URL(match[1]);
    const pageInfo = nextUrl.searchParams.get("page_info");
    if (!pageInfo) break;
    nextPageInfo = pageInfo;

    safety++;
    if (safety > 60) break;
  }

  return { totalAmount, count: totalCount };
}

/**
 * Fetch Shopify Balance Transactions to get actual processing fees
 * Balance transactions include the actual fees charged by Shopify Payments
 */
interface BalanceTransaction {
  id: number;
  type: string; // "charge", "refund", "dispute", etc.
  amount: string;
  fee: string; // The actual processing fee
  net: string;
  source_order_id: number | null;
  source_order_transaction_id: number | null;
  source_type: string;
  currency: string;
  processed_at: string;
}

export async function fetchShopifyBalanceTransactions(
  shopDomain: string,
  accessToken: string,
  dateRange: DateRange,
  apiVersion: string = "2025-10",
  eurToUsdRate: number = 1.1665,
  timezoneOffsetMinutes: number = -300 // Default: EST (UTC-5)
): Promise<{ orderFees: Map<number, number>; totalDisputeValue: number; totalDisputeFees: number; totalDisputeRecovered: number; totalDisputeFeesRecovered: number; totalRefunds: number; pageCount: number }> {
  // Returns order fees map, dispute value, and dispute fees separately
  const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/shopify_payments/balance/transactions.json`;
  
  const orderFees = new Map<number, number>();
  let totalDisputeValue = 0;
  let totalDisputeFees = 0;
  let totalDisputeRecovered = 0; // Track money recovered from won chargebacks
  let totalDisputeFeesRecovered = 0; // Track fees recovered from won chargebacks
  let totalRefunds = 0; // Track total refund amounts
  let pageCount = 0;
  const MAX_PAGES = 10; // Safety limit: fetch max 10 pages (2500 transactions)
  let hasMore = true;
  let lastId: number | null = null;

  while (hasMore && pageCount < MAX_PAGES) {
    pageCount++;
    const params = new URLSearchParams({
      limit: "250",
      // Note: API doesn't support processed_at filtering, we filter client-side after fetching
      // payout_date filtering excludes pending transactions, so we don't use it
    });
    
    if (lastId) {
      params.append("last_id", lastId.toString());
    }

    const url = `${baseUrl}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If 404 or 403, the store doesn't have access to balance transactions (not using Shopify Payments or missing permissions)
      if (response.status === 404 || response.status === 403) {
        console.log(`[Balance Transactions] Not available for this store (${response.status}), using calculated fees`);
        return { orderFees: new Map(), totalDisputeValue: 0, totalDisputeFees: 0, totalDisputeRecovered: 0, totalDisputeFeesRecovered: 0, totalRefunds: 0, pageCount: 0 }; // Return empty data, will fall back to calculated fees
      }
      const errorText = await response.text();
      throw new Error(
        `Shopify balance transactions API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    const transactions: BalanceTransaction[] = data.transactions || [];

    if (transactions.length === 0) {
      hasMore = false;
      break;
    }

    // Process transactions with date filtering
    for (const txn of transactions) {
      // Filter by date range using processed_at timestamp
      // Account for store timezone: interpret date strings in store's local time, not UTC
      const txnDate = new Date(txn.processed_at);
      
      // Create date range in store's timezone
      // Example: If store is EST (UTC-5, offset = -300), and user selects "2025-12-14":
      // - fromDate should be 2025-12-14 00:00:00 EST = 2025-12-14 05:00:00 UTC
      // - toDate should be 2025-12-14 23:59:59 EST = 2025-12-15 04:59:59 UTC
      const fromDate = new Date(dateRange.fromDate + 'T00:00:00');
      const toDate = new Date(dateRange.toDate + 'T23:59:59');
      
      // Adjust for timezone offset (offset is in minutes, negative for west of UTC)
      // Convert offset to milliseconds and subtract (because offset is negative for EST)
      const offsetMs = timezoneOffsetMinutes * 60 * 1000;
      fromDate.setTime(fromDate.getTime() - offsetMs);
      toDate.setTime(toDate.getTime() - offsetMs);
      
      // Debug logging for order 12621097337158
      if (txn.source_order_id === 12621097337158) {
        console.log(`[Date Filter Debug] Order 12621097337158 transaction:`, {
          processed_at: txn.processed_at,
          txnDate: txnDate.toISOString(),
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          passesFilter: !(txnDate < fromDate || txnDate > toDate),
          txnBeforeFrom: txnDate < fromDate,
          txnAfterTo: txnDate > toDate
        });
      }
      
      // Skip transactions outside the date range
      if (txnDate < fromDate || txnDate > toDate) {
        continue;
      }
      
      // Normalize transaction type for comparison (case-insensitive, spaces to underscores)
      const txnTypeNormalized = (txn.type || "").toLowerCase().replace(/\s+/g, "_");
      
      // Log ALL transaction types to understand what we're seeing
      if (txnTypeNormalized !== "charge" && txnTypeNormalized !== "chargeback" && txnTypeNormalized !== "dispute") {
        console.log(`[Unknown Transaction Type] ${txn.type}:`, {
          txn_id: txn.id,
          type: txn.type,
          source_type: txn.source_type,
          source_order_id: txn.source_order_id,
          amount: txn.amount,
          fee: txn.fee,
          currency: txn.currency
        });
      }
      
      // Extract processing fees from ALL transactions linked to orders
      // Capture fees from ANY transaction type that has a source_order_id
      // Only exclude disputes/chargebacks (handled separately below)
      if (txn.source_order_id && txnTypeNormalized !== "chargeback" && txnTypeNormalized !== "dispute" && txnTypeNormalized !== "refund") {
        const orderId = Number(txn.source_order_id); // Ensure it's a number
        const feeAmount = Math.abs(parseFloat(txn.fee)); // Use absolute value like disputes
        // Convert to USD if currency is EUR
        const feeUsd = txn.currency === "EUR" ? feeAmount * eurToUsdRate : feeAmount;
        
        // Debug logging for ALL orders to understand fee structure
        console.log(`[Fee Transaction] Order ${orderId} (type: ${txn.type}):`, {
          txn_id: txn.id,
          type: txn.type,
          source_type: txn.source_type,
          amount: txn.amount,
          fee_original: feeAmount.toFixed(2),
          fee_usd: feeUsd.toFixed(2),
          processed_at: txn.processed_at,
          currency: txn.currency
        });
        
        // Accumulate fees for the same order (in case there are multiple charges)
        const existingFee = orderFees.get(orderId) || 0;
        orderFees.set(orderId, existingFee + feeUsd);
        
        console.log(`[Fee Transaction] Order ${orderId} running total: $${orderFees.get(orderId)?.toFixed(2)}`);
      }
      
      // Extract chargeback reversals (when you win a dispute)
      // Shopify uses different types: chargeback_reversal, chargeback_won, dispute_reversal
      // Also handle variations with spaces and different cases (e.g., "Chargeback Won")
      const reversalTypes = ["chargeback_reversal", "chargeback_won", "dispute_reversal"];
      if (reversalTypes.includes(txnTypeNormalized)) {
        const reversalAmount = Math.abs(parseFloat(txn.amount)); // Money returned to you
        const reversalFee = Math.abs(parseFloat(txn.fee)); // Fee also returned when you win
        // Convert to USD if currency is EUR
        const reversalUsd = txn.currency === "EUR" ? reversalAmount * eurToUsdRate : reversalAmount;
        const reversalFeeUsd = txn.currency === "EUR" ? reversalFee * eurToUsdRate : reversalFee;
        
        console.log(`[Chargeback Reversal] Found ${txn.type}:`, {
          txn_id: txn.id,
          source_order_id: txn.source_order_id,
          amount_original: reversalAmount,
          amount_usd: reversalUsd.toFixed(2),
          fee_original: reversalFee,
          fee_usd: reversalFeeUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at
        });
        
        // Track recovered amount separately (money won back from disputes)
        totalDisputeRecovered += reversalUsd;
        // Dispute fees ARE refunded when you win, so track them too
        totalDisputeFeesRecovered += reversalFeeUsd;
      }
      
      // Extract chargeback amounts (negative impact on profit)
      // Shopify uses lowercase "chargeback" for the type (now case-insensitive)
      if (txnTypeNormalized === "chargeback" || txnTypeNormalized === "dispute") {
        const amountOriginal = Math.abs(parseFloat(txn.amount)); // Chargeback amount
        const feeOriginal = Math.abs(parseFloat(txn.fee)); // Chargeback/dispute fee
        
        // Convert to USD if currency is EUR
        const amountUsd = txn.currency === "EUR" ? amountOriginal * eurToUsdRate : amountOriginal;
        const feeUsd = txn.currency === "EUR" ? feeOriginal * eurToUsdRate : feeOriginal;
        
        console.log(`[Dispute Transaction] Found ${txn.type}:`, {
          txn_id: txn.id,
          type: txn.type,
          source_type: txn.source_type,
          source_order_id: txn.source_order_id,
          amount_original: amountOriginal,
          fee_original: feeOriginal,
          amount_usd: amountUsd.toFixed(2),
          fee_usd: feeUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at
        });
        
        // Accumulate in USD
        totalDisputeValue += amountUsd;
        totalDisputeFees += feeUsd;
      }
      
      // Extract refunds
      if (txn.type === "refund") {
        const refundAmount = Math.abs(parseFloat(txn.amount)); // Refund amount (money returned to customer)
        // Convert to USD if currency is EUR
        const refundUsd = txn.currency === "EUR" ? refundAmount * eurToUsdRate : refundAmount;
        
        console.log(`[Refund Transaction] Found refund:`, {
          txn_id: txn.id,
          source_order_id: txn.source_order_id,
          amount_original: refundAmount,
          amount_usd: refundUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at
        });
        
        // Accumulate total refunds
        totalRefunds += refundUsd;
      }
    }
    // Check if there are more pages
    const linkHeader = response.headers.get("link");
    if (linkHeader && linkHeader.includes('rel="next"')) {
      lastId = transactions[transactions.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  console.log(`[Balance Transactions] Fetched ${orderFees.size} orders with fees from ${pageCount} pages, dispute value: $${totalDisputeValue.toFixed(2)}, dispute fees: $${totalDisputeFees.toFixed(2)}, dispute recovered: $${totalDisputeRecovered.toFixed(2)}, refunds: $${totalRefunds.toFixed(2)}`);
  console.log(`[Balance Transactions] Sample orderFees entries:`, Array.from(orderFees.entries()).slice(0, 5));
  return { orderFees, totalDisputeValue, totalDisputeFees, totalDisputeRecovered, totalDisputeFeesRecovered, totalRefunds, pageCount };
}
