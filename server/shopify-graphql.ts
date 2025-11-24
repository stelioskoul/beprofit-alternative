/**
 * Shopify GraphQL API Integration
 * Fetches transaction fees using GraphQL API
 */

import { getApiCredential } from "./db";
import { decrypt } from "./utils";

interface TransactionFee {
  amount: {
    amount: string;
  };
}

interface Transaction {
  fees: TransactionFee[];
}

interface Order {
  id: string;
  transactions: Transaction[];
}

interface GraphQLResponse {
  data: {
    order: Order;
  };
}

/**
 * Fetch transaction fees for an order using GraphQL
 * Returns the total processing fee in the order's currency
 */
export async function getOrderTransactionFees(orderId: number): Promise<number> {
  try {
    const credential = await getApiCredential("shopify");
    if (!credential?.accessToken || !credential?.storeDomain) {
      return 0;
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    // GraphQL query to get transaction fees
    const query = `
      query getOrderFees($id: ID!) {
        order(id: $id) {
          id
          transactions {
            fees {
              amount {
                amount
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: `gid://shopify/Order/${orderId}`,
    };

    const response = await fetch(`https://${storeDomain}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      console.error("[Shopify GraphQL] API error:", response.status);
      return 0;
    }

    const data: GraphQLResponse = await response.json();
    
    // Sum all transaction fees
    let totalFees = 0;
    if (data.data?.order?.transactions) {
      for (const transaction of data.data.order.transactions) {
        if (transaction.fees) {
          for (const fee of transaction.fees) {
            totalFees += parseFloat(fee.amount.amount || "0");
          }
        }
      }
    }

    return totalFees;
  } catch (error) {
    console.error("[Shopify GraphQL] Failed to fetch transaction fees:", error);
    return 0;
  }
}
