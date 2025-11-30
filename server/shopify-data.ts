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
        "id,order_number,created_at,total_price,currency,customer,line_items,shipping_address,shipping_lines"
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
