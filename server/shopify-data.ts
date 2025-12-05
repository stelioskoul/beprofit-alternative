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
  eurToUsdRate: number = 1.1665
): Promise<{ orderFees: Map<number, number>; totalDisputeValue: number; totalDisputeFees: number }> {
  // Returns order fees map, dispute value, and dispute fees separately
  const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/shopify_payments/balance/transactions.json`;
  
  const orderFees = new Map<number, number>();
  let totalDisputeValue = 0;
  let totalDisputeFees = 0;
  let pageCount = 0;
  const MAX_PAGES = 10; // Safety limit: fetch max 10 pages (2500 transactions)
  let hasMore = true;
  let lastId: number | null = null;

  while (hasMore && pageCount < MAX_PAGES) {
    pageCount++;
    const params = new URLSearchParams({
      limit: "250",
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
        return { orderFees: new Map(), totalDisputeValue: 0, totalDisputeFees: 0 }; // Return empty data, will fall back to calculated fees
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
      const txnDate = new Date(txn.processed_at);
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      toDate.setHours(23, 59, 59, 999); // Include the entire "to" date
      
      // Skip transactions outside the date range
      if (txnDate < fromDate || txnDate > toDate) {
        continue;
      }
      
      // Extract processing fees from charge transactions
      if (txn.type === "charge" && txn.source_order_id) {
        const orderId = txn.source_order_id;
        const feeEur = parseFloat(txn.fee);
        const feeUsd = feeEur * eurToUsdRate; // Convert EUR to USD
        
        // Accumulate fees for the same order (in case there are multiple charges)
        const existingFee = orderFees.get(orderId) || 0;
        orderFees.set(orderId, existingFee + feeUsd);
      }
      
      // Extract chargeback amounts (negative impact on profit)
      // Shopify uses lowercase "chargeback" for the type
      if (txn.type === "chargeback" || txn.type === "dispute") {
        const amountEur = Math.abs(parseFloat(txn.amount)); // Chargeback amount
        const feeEur = Math.abs(parseFloat(txn.fee)); // Chargeback/dispute fee
        
        // Convert to USD and accumulate separately
        totalDisputeValue += amountEur * eurToUsdRate;
        totalDisputeFees += feeEur * eurToUsdRate;
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

  console.log(`[Balance Transactions] Fetched ${orderFees.size} orders with fees from ${pageCount} pages, dispute value: $${totalDisputeValue.toFixed(2)}, dispute fees: $${totalDisputeFees.toFixed(2)}`);
  return { orderFees, totalDisputeValue, totalDisputeFees };
}
