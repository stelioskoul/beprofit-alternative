import { ENV } from "./_core/env";

interface ShopifyDispute {
  id: number;
  order_id: number | null;
  type: "inquiry" | "chargeback";
  amount: string;
  currency: string;
  reason: string;
  network_reason_code: string;
  status: string;
  evidence_due_by: string | null;
  evidence_sent_on: string | null;
  finalized_on: string | null;
  initiated_at: string;
}

interface ShopifyDisputesResponse {
  disputes: ShopifyDispute[];
}

/**
 * Fetch disputes from Shopify API
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format (optional)
 * @param status - Filter by status (optional): won, lost, needs_response, under_review, etc.
 */
export async function fetchShopifyDisputes(
  startDate?: string,
  endDate?: string,
  status?: string
): Promise<ShopifyDispute[]> {
  const shopDomain = ENV.shopifyShopDomain;
  const accessToken = ENV.shopifyClientSecret; // Using client secret as access token for now
  
  if (!shopDomain || !accessToken) {
    throw new Error("Shopify credentials not configured");
  }

  // Build query parameters
  const params = new URLSearchParams();
  if (startDate) {
    params.append("initiated_at", startDate);
  }
  if (status) {
    params.append("status", status);
  }

  const url = `https://${shopDomain}/admin/api/2025-10/shopify_payments/disputes.json${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: ShopifyDisputesResponse = await response.json();
  
  // Filter by date range if endDate provided (API only supports single date filter)
  let disputes = data.disputes;
  if (endDate && startDate) {
    const endDateTime = new Date(endDate + "T23:59:59Z").getTime();
    disputes = disputes.filter((dispute) => {
      const initiatedAt = new Date(dispute.initiated_at).getTime();
      return initiatedAt <= endDateTime;
    });
  }

  return disputes;
}

/**
 * Convert Shopify amount string to cents integer
 */
export function amountToCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

/**
 * Parse ISO 8601 timestamp to Date or null
 */
export function parseTimestamp(timestamp: string | null): Date | null {
  if (!timestamp) return null;
  return new Date(timestamp);
}
