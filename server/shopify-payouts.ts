import { ENV } from "./_core/env";
import { getShopifyAccessToken } from "./db";

interface PayoutFee {
  amount: string;
  currencyCode: string;
}

interface PayoutNode {
  id: string;
  issuedAt: string;
  summary: {
    chargesFee: PayoutFee;
  };
}

interface PayoutsResponse {
  data: {
    shopifyPaymentsAccount: {
      payouts: {
        edges: Array<{
          node: PayoutNode;
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
}

/**
 * Fetch processing fees from Shopify Payouts for a given date range
 */
export async function getProcessingFees(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const shopDomain = ENV.shopifyShopDomain;
  const accessToken = await getShopifyAccessToken();

  if (!shopDomain || !accessToken) {
    console.warn("[Shopify Payouts] Missing credentials or access token");
    return 0;
  }

  try {
    let totalFees = 0;
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const query = `
        query GetPayouts($cursor: String) {
          shopifyPaymentsAccount {
            payouts(first: 250, after: $cursor) {
              edges {
                node {
                  id
                  issuedAt
                  summary {
                    chargesFee {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query,
            variables: { cursor },
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `[Shopify Payouts] API error: ${response.status} ${response.statusText}`
        );
        break;
      }

      const data: PayoutsResponse = await response.json();
      const payouts = data.data.shopifyPaymentsAccount.payouts;

      // Filter payouts by date range and sum fees
      for (const edge of payouts.edges) {
        const payout = edge.node;
        const payoutDate = new Date(payout.issuedAt);

        if (payoutDate >= startDate && payoutDate <= endDate) {
          const feeAmount = parseFloat(payout.summary.chargesFee.amount);
          totalFees += feeAmount;
        }
      }

      hasNextPage = payouts.pageInfo.hasNextPage;
      cursor = payouts.pageInfo.endCursor;

      // Safety: don't fetch more than 10 pages (2500 payouts)
      if (!hasNextPage || !cursor) break;
    }

    return totalFees;
  } catch (error) {
    console.error("[Shopify Payouts] Error fetching fees:", error);
    return 0;
  }
}
