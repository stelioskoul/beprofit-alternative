# Shopify Webhook Configuration Guide

## Setting Up Webhooks from Shopify Admin

To receive real-time updates from your Shopify store, configure these webhooks in your **Shopify Admin > Settings > Notifications**.

### Webhook Base URL
```
https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify
```

### Required Webhooks

Configure the following webhooks in your Shopify Admin:

#### 1. Order Creation
- **Event**: Order creation
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/orders/create`

#### 2. Order Updates
- **Event**: Order updated
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/orders/updated`

#### 3. Order Cancellation
- **Event**: Order cancelled
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/orders/cancelled`

#### 4. Product Creation
- **Event**: Product creation
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/products/create`

#### 5. Product Updates
- **Event**: Product update
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/products/update`

#### 6. Refund Creation
- **Event**: Refund created
- **Format**: JSON
- **URL**: `https://3000-irgi8k3cpb0mtow9en1gy-441012d9.manusvm.computer/api/webhooks/shopify/refunds/create`

### Steps to Configure

1. Log in to your Shopify Admin panel
2. Go to **Settings** → **Notifications**
3. Scroll down to the **Webhooks** section
4. Click **Create webhook** for each event type listed above
5. Select the event from the dropdown
6. Set Format to **JSON**
7. Paste the corresponding URL from above
8. Click **Save webhook**

### Security

All webhooks are protected with HMAC signature verification using your Shopify Client Secret. The system automatically:
- Verifies the `X-Shopify-Hmac-SHA256` header
- Rejects unauthorized requests
- Logs all webhook deliveries to the `webhookLogs` database table

### Testing Webhooks

After configuration, you can test webhooks by:
1. Creating a test order in your Shopify store
2. Updating a product
3. Processing a refund

Check the server logs to verify webhook delivery:
- Successful webhooks will log: `[Webhook] Order created: {id} - {name}`
- Failed webhooks will log errors with details

### Monitoring

View webhook delivery logs in the database:
```sql
SELECT * FROM webhookLogs ORDER BY createdAt DESC LIMIT 50;
```

This shows recent webhook events, their status (success/error), and any error messages.
