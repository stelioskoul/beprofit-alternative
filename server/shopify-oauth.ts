import crypto from "crypto";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN!;

// OAuth scopes - requesting all permissions as user specified
const SCOPES = [
  "read_orders",
  "write_orders",
  "read_products",
  "write_products",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
  "read_analytics",
  "read_reports",
  "read_price_rules",
  "write_price_rules",
  "read_discounts",
  "write_discounts",
].join(",");

export function getShopifyAuthUrl(redirectUri: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  
  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state: nonce,
  });

  return `https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; scope: string }> {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  return await response.json();
}

export async function registerWebhooks(accessToken: string): Promise<void> {
  const webhooks = [
    { topic: "orders/create", address: "/api/webhooks/shopify/orders/create" },
    { topic: "orders/updated", address: "/api/webhooks/shopify/orders/updated" },
    { topic: "orders/cancelled", address: "/api/webhooks/shopify/orders/cancelled" },
    { topic: "products/create", address: "/api/webhooks/shopify/products/create" },
    { topic: "products/update", address: "/api/webhooks/shopify/products/update" },
    { topic: "products/delete", address: "/api/webhooks/shopify/products/delete" },
    { topic: "refunds/create", address: "/api/webhooks/shopify/refunds/create" },
  ];

  for (const webhook of webhooks) {
    try {
      const response = await fetch(
        `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic: webhook.topic,
              address: `${process.env.VITE_APP_URL || 'https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer'}${webhook.address}`,
              format: "json",
            },
          }),
        }
      );

      if (response.ok) {
        console.log(`[Shopify] Registered webhook: ${webhook.topic}`);
      } else {
        console.error(`[Shopify] Failed to register webhook ${webhook.topic}:`, await response.text());
      }
    } catch (error) {
      console.error(`[Shopify] Error registering webhook ${webhook.topic}:`, error);
    }
  }
}

export function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  const hash = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
