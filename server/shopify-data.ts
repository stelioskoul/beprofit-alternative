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
): Promise<{ 
  totalAmount: number; 
  count: number;
  wonAmount: number;
  wonCount: number;
  lostAmount: number;
  lostCount: number;
  pendingAmount: number;
  pendingCount: number;
}> {
  const tz = offsetToTzString(timezoneOffset);
  const initiatedMin = `${dateRange.fromDate}T00:00:00${tz}`;
  const initiatedMax = `${dateRange.toDate}T23:59:59${tz}`;

  const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/shopify_payments/disputes.json`;

  // Helper function to fetch disputes by status
  async function fetchByStatus(status: string): Promise<{ amount: number; count: number }> {
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
        url.searchParams.set("status", status);
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
          return { amount: 0, count: 0 };
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
        console.log(`[Dispute ${status.toUpperCase()}] ID: ${dispute.id}, Amount: ${dispute.amount} ${dispute.currency}, Status: ${dispute.status}`);
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

    return { amount: totalAmount, count: totalCount };
  }

  // Fetch won, lost, and pending disputes
  // Pending includes: needs_response, under_review
  const [won, lost, needsResponse, underReview] = await Promise.all([
    fetchByStatus("won"),
    fetchByStatus("lost"),
    fetchByStatus("needs_response"),
    fetchByStatus("under_review")
  ]);

  const pendingAmount = needsResponse.amount + underReview.amount;
  const pendingCount = needsResponse.count + underReview.count;
  const totalAmount = won.amount + lost.amount + pendingAmount;
  const totalCount = won.count + lost.count + pendingCount;

  console.log(`[Disputes Summary] Won: ${won.count} ($${won.amount.toFixed(2)}), Lost: ${lost.count} ($${lost.amount.toFixed(2)}), Pending: ${pendingCount} ($${pendingAmount.toFixed(2)}), Total: ${totalCount} ($${totalAmount.toFixed(2)})`);

  return { 
    totalAmount,
    count: totalCount,
    wonAmount: won.amount,
    wonCount: won.count,
    lostAmount: lost.amount,
    lostCount: lost.count,
    pendingAmount,
    pendingCount
  };
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
      
      // Log ALL transaction types to help debug
      console.log(`[Transaction] Type: "${txn.type}" -> Normalized: "${txnTypeNormalized}" | Amount: ${txn.amount} | Fee: ${txn.fee} | Date: ${txn.processed_at}`);
      
      // Log unusual transaction types to understand what we're seeing
      const knownTypes = ["charge", "chargeback", "dispute", "refund", "dispute_reversal", "chargeback_reversal", "chargeback_won", "chargeback_fee", "chargeback_fee_refund", "dispute_withdrawal", "chargeback_hold", "chargeback_hold_release"];
      if (!knownTypes.includes(txnTypeNormalized)) {
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
      
      // Handle all dispute-related transactions
      // Shopify uses "dispute" type for both won and lost chargebacks
      // The sign of the amount determines won vs lost:
      // - NEGATIVE amount = Lost chargeback (money taken from you)
      // - POSITIVE amount = Won chargeback (money returned to you)
      const disputeTypes = ["chargeback", "dispute", "dispute_withdrawal", "dispute_reversal", "chargeback_reversal", "chargeback_won"];
      
      if (disputeTypes.includes(txnTypeNormalized)) {
        const rawAmount = parseFloat(txn.amount); // Keep the sign to determine won vs lost
        const rawFee = parseFloat(txn.fee); // Fee (usually negative when charged)
        
        // Convert to USD if currency is EUR
        const amountUsd = txn.currency === "EUR" ? rawAmount * eurToUsdRate : rawAmount;
        const feeUsd = txn.currency === "EUR" ? rawFee * eurToUsdRate : rawFee;
        
        console.log(`[Dispute Transaction] Found ${txn.type}:`, {
          txn_id: txn.id,
          type: txn.type,
          source_type: txn.source_type,
          source_order_id: txn.source_order_id,
          raw_amount: rawAmount,
          raw_fee: rawFee,
          amount_usd: amountUsd.toFixed(2),
          fee_usd: feeUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at,
          is_won: rawAmount > 0 ? 'YES (positive amount)' : 'NO (negative amount)'
        });
        
        // Determine if this is a won or lost dispute based on amount sign
        if (rawAmount > 0) {
          // POSITIVE amount = Won chargeback (money returned to you)
          totalDisputeRecovered += Math.abs(amountUsd);
          // Fee is also recovered when you win (take absolute value regardless of sign)
          // The fee might be positive (refund) or we use the same fee that was charged
          const feeRecovered = Math.abs(feeUsd);
          totalDisputeFeesRecovered += feeRecovered;
          console.log(`[Dispute WON] Amount recovered: $${Math.abs(amountUsd).toFixed(2)}, Fee recovered: $${feeRecovered.toFixed(2)} (raw fee: ${rawFee})`);
        } else if (rawAmount < 0) {
          // NEGATIVE amount = Lost chargeback (money taken from you)
          totalDisputeValue += Math.abs(amountUsd);
          // Fee is charged to you (take absolute value)
          totalDisputeFees += Math.abs(feeUsd);
          console.log(`[Dispute LOST] Amount lost: $${Math.abs(amountUsd).toFixed(2)}, Fee charged: $${Math.abs(feeUsd).toFixed(2)}`);
        }
        // Note: rawAmount === 0 transactions are ignored (no financial impact)
      }
      
      // Handle chargeback_fee separately (standalone fee transaction)
      if (txnTypeNormalized === "chargeback_fee") {
        const feeAmount = Math.abs(parseFloat(txn.amount)); // The fee amount
        const feeUsd = txn.currency === "EUR" ? feeAmount * eurToUsdRate : feeAmount;
        
        console.log(`[Chargeback Fee] Found:`, {
          txn_id: txn.id,
          type: txn.type,
          fee_amount: feeAmount,
          fee_usd: feeUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at
        });
        
        totalDisputeFees += feeUsd;
      }
      
      // Handle chargeback_fee_refund separately (fee recovery only)
      if (txnTypeNormalized === "chargeback_fee_refund") {
        const refundedFee = Math.abs(parseFloat(txn.amount)); // The fee amount being refunded
        const refundedFeeUsd = txn.currency === "EUR" ? refundedFee * eurToUsdRate : refundedFee;
        
        console.log(`[Chargeback Fee Refund] Found:`, {
          txn_id: txn.id,
          type: txn.type,
          fee_refunded: refundedFee,
          fee_refunded_usd: refundedFeeUsd.toFixed(2),
          currency: txn.currency,
          processed_at: txn.processed_at
        });
        
        totalDisputeFeesRecovered += refundedFeeUsd;
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
