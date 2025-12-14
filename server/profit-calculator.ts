/**
 * Profit calculation engine
 * Migrated from original Netlify functions with multi-store support
 */

interface CogsConfigMap {
  [variantId: string]: number; // variantId -> cogs value
}

interface ShippingConfigMap {
  [variantId: string]: {
    [shippingType: string]: {
      [region: string]: {
        [quantity: string]: number;
      };
    };
  };
}

interface LineItem {
  variant_id?: number | string;
  product_id?: number | string;
  title?: string;
  name?: string;
  quantity: number;
  price?: string | number;
}

interface ShopifyOrder {
  id: string;
  order_number: number;
  created_at: string;
  total_price: string;
  currency: string;
  total_discounts?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
  };
  line_items: LineItem[];
  shipping_address?: {
    country?: string;
  };
  shipping_lines: any[];
}

function mapCountryToRegion(country?: string | null): string | null {
  if (!country) return null;
  const c = country.toString().trim().toUpperCase();
  if (!c) return null;
  if (
    c === "US" ||
    c === "USA" ||
    c === "UNITED STATES" ||
    c === "UNITED STATES OF AMERICA"
  ) {
    return "USA";
  }
  if (c === "CA" || c === "CANADA") {
    return "CANADA";
  }
  // Treat everything else as EU for shipping purposes
  return "EU";
}

function inferShippingType(order: ShopifyOrder): string {
  const lines = order.shipping_lines || [];
  if (!lines.length) return "free";
  const title = (lines[0].title || "").toString().toLowerCase();
  if (
    title.includes("express") ||
    title.includes("expedited") ||
    title.includes("priority")
  ) {
    return "express";
  }
  return "free";
}

function getItemConfigKey(item: LineItem): string | null {
  if (item.variant_id != null && item.variant_id !== undefined) {
    return String(item.variant_id);
  }
  if (item.product_id != null && item.product_id !== undefined) {
    return String(item.product_id);
  }
  const title = item.title || item.name;
  if (title) {
    return title.toString();
  }
  return null;
}

export function computeCogsForLineItem(item: LineItem, cogsConfig: CogsConfigMap): number {
  if (!item) return 0;
  const quantity = item.quantity || 0;
  if (!quantity) return 0;

  const key = getItemConfigKey(item);
  if (!key) return 0;

  const perItem = cogsConfig[key];
  if (!perItem || isNaN(perItem)) return 0;

  return perItem * quantity;
}

export function computeShippingForLineItem(
  item: LineItem,
  region: string | null,
  shippingType: string,
  shippingConfig: ShippingConfigMap,
  exchangeRate: number = 1.0
): number {
  if (!item || !region || !shippingType) return 0;

  let quantity = item.quantity || 0;
  if (quantity <= 0) return 0;

  const key = getItemConfigKey(item);
  if (!key) return 0;

  let productConfig: any = shippingConfig[key];
  if (!productConfig) return 0;

  // Check if config has the new format with currency
  let configCurrency = "USD"; // default
  let rates: any = productConfig;
  
  if (productConfig.currency && productConfig.rates) {
    configCurrency = productConfig.currency;
    rates = productConfig.rates;
  }

  // Map region names to match new UI format (US, EU, CA)
  let countryKey = region;
  if (region === "USA") countryKey = "US";
  if (region === "CANADA") countryKey = "CA";
  
  // Map shipping type to method name (Standard, Express)
  let methodKey = "Standard";
  if (shippingType === "express") methodKey = "Express";
  
  // New format: rates[country][method][quantity]
  const countryConfig = rates[countryKey];
  if (!countryConfig) return 0;

  const methodConfig = countryConfig[methodKey];
  if (!methodConfig) return 0;

  const keys = Object.keys(methodConfig)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  if (!keys.length) return 0;

  let total = 0;
  const maxKey = keys[keys.length - 1];

  // If within table range, treat as a single tier lookup.
  if (quantity <= maxKey) {
    const v = methodConfig[String(quantity)];
    const num = parseFloat(String(v));
    total = isNaN(num) ? 0 : num;
  } else {
    // If above table range, break into largest-available tiers greedily.
    while (quantity > 0) {
      let tier = keys[0];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const next = keys[i + 1];
        if (k <= quantity && (!next || next > quantity)) {
          tier = k;
          break;
        }
      }

      const v = methodConfig[String(tier)];
      const num = parseFloat(String(v));
      if (!isNaN(num)) {
        total += num;
      }

      quantity -= tier;
    }
  }

  // Convert to USD if config is in EUR (for consistency, all costs returned in USD)
  if (configCurrency === "EUR" && exchangeRate > 0) {
    total = total * exchangeRate;
  }

  return total;
}

export interface ProcessedOrder {
  id: string;
  orderNumber: number;
  createdAt: string;
  customer: string;
  total: number;
  currency: string;
  discount: number;
  tip: number;
  shippingRevenue: number;
  country: string | null;
  cogs: number;
  shippingCost: number;
  processingFees: number;
  shippingType: string;
  region: string | null;
  items: LineItem[];
}

export function processOrders(
  orders: ShopifyOrder[],
  cogsConfig: CogsConfigMap,
  shippingConfig: ShippingConfigMap,
  exchangeRate: number = 1.0,
  orderFees?: Map<number, number> // Map of order_id -> actual processing fee from Shopify
): {
  revenue: number;
  ordersCount: number;
  totalCogs: number;
  totalShipping: number;
  processedOrders: ProcessedOrder[];
} {
  let revenue = 0;
  let totalCogs = 0;
  let totalShipping = 0;
  const processedOrders: ProcessedOrder[] = [];

  for (const order of orders) {
    const val = parseFloat(order.total_price || "0");
    if (!isNaN(val)) {
      revenue += val;
    }

    const shippingCountry = order.shipping_address?.country || null;
    const customerName =
      order.customer
        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(" ")
        : "Guest";

    const region = mapCountryToRegion(shippingCountry);
    const shippingType = inferShippingType(order);

    let orderCogs = 0;
    let orderShipping = 0;

    const lineItems = order.line_items || [];
    const enrichedLineItems = [];
    
    for (const item of lineItems) {
      const itemCogs = computeCogsForLineItem(item, cogsConfig);
      const itemShipping = region ? computeShippingForLineItem(item, region, shippingType, shippingConfig, exchangeRate) : 0;
      
      // Debug logging for first order
      if (processedOrders.length === 0 && lineItems.indexOf(item) === 0) {
        const key = getItemConfigKey(item);
        console.log(`[Shipping Debug] Order ${order.order_number}:`);
        console.log(`  - variant_id: ${item.variant_id} (${typeof item.variant_id})`);
        console.log(`  - Config key: ${key}`);
        console.log(`  - Has shipping config: ${!!shippingConfig[key!]}`);
        console.log(`  - Region: ${region}, Shipping Type: ${shippingType}`);
        console.log(`  - Calculated shipping: $${itemShipping}`);
        if (shippingConfig[key!]) {
          console.log(`  - Shipping config:`, JSON.stringify(shippingConfig[key!]).substring(0, 200));
        }
      }
      
      orderCogs += itemCogs;
      orderShipping += itemShipping;
      
      // Create enriched line item with calculated values
      const itemPrice = parseFloat(String(item.price || "0"));
      enrichedLineItems.push({
        ...item,
        price: itemPrice,
        cogs: itemCogs,
        shippingCost: itemShipping,
      });
    }

    totalCogs += orderCogs;
    totalShipping += orderShipping;

    const discountValue = order.total_discounts ? parseFloat(order.total_discounts) : 0;
    
    // Extract tip (what customer paid as tip)
    const tipValue = (order as any).total_tip_received ? parseFloat((order as any).total_tip_received) : 0;
    
    // Extract shipping revenue (what customer paid for shipping)
    let shippingRevenue = 0;
    if (order.shipping_lines && order.shipping_lines.length > 0) {
      for (const shippingLine of order.shipping_lines) {
        const price = parseFloat(String(shippingLine.price || "0"));
        if (!isNaN(price)) {
          shippingRevenue += price;
        }
      }
    }
    
    // Use actual processing fees from Shopify balance transactions if available
    // Otherwise fallback to calculated fees (2.8% + $0.29)
    const orderIdNum = parseInt(order.id);
    const orderProcessingFees = orderFees && orderFees.has(orderIdNum) 
      ? orderFees.get(orderIdNum)! 
      : val * 0.028 + 0.29;
    
    // Debug logging for order #11472
    if (order.order_number === 11472) {
      console.log(`[Order #11472] Internal ID: ${orderIdNum} (type: ${typeof orderIdNum}), Has fee data: ${orderFees?.has(orderIdNum)}, Fee: $${orderProcessingFees.toFixed(2)}`);
      if (orderFees) {
        console.log(`[Order #11472] orderFees map size: ${orderFees.size}, sample keys:`, Array.from(orderFees.keys()).slice(0, 5));
      }
    }
    
    processedOrders.push({
      id: "#" + (order.order_number || order.id),
      orderNumber: order.order_number,
      createdAt: order.created_at,
      customer: customerName,
      total: val,
      currency: order.currency || "USD",
      discount: discountValue,
      tip: tipValue,
      shippingRevenue,
      country: shippingCountry || null,
      cogs: orderCogs,
      shippingCost: orderShipping,
      processingFees: orderProcessingFees,
      shippingType,
      region,
      items: enrichedLineItems,
    });
  }

  return {
    revenue,
    ordersCount: orders.length,
    totalCogs,
    totalShipping,
    processedOrders,
  };
}

export function calculateProcessingFees(
  revenue: number,
  ordersCount: number,
  percentFee: number = 0.028,
  fixedFee: number = 0.29
): number {
  return revenue * percentFee + ordersCount * fixedFee;
}

/**
 * Calculate operational expenses for a given period
 * Counts discrete occurrences of recurring expenses (not prorated)
 * 
 * Logic:
 * - One-time: Count once if date falls in range
 * - Monthly: Count once for each month where the expense is active
 * - Yearly: Count once for each year where the expense is active
 * - Respects endDate for "No Longer Active" expenses
 */
export function calculateOperationalExpensesForPeriod(
  expenses: Array<{
    type: "one_time" | "monthly" | "yearly";
    amount: number;
    date?: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>,
  fromDate: Date,
  toDate: Date
): number {
  let total = 0;

  for (const expense of expenses) {
    if (expense.type === "one_time") {
      // One-time expense: count once if date falls in range
      if (expense.date) {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= fromDate && expenseDate <= toDate) {
          total += expense.amount;
        }
      }
    } else if (expense.type === "monthly") {
      // Monthly recurring: count once for each occurrence in range
      if (!expense.startDate) continue;

      const start = new Date(expense.startDate);
      const end = expense.endDate ? new Date(expense.endDate) : new Date("2099-12-31"); // Far future if no end date

      // Generate all monthly occurrences
      let currentDate = new Date(start);
      while (currentDate <= end && currentDate <= toDate) {
        // Check if this occurrence falls in the query range
        if (currentDate >= fromDate && currentDate <= toDate) {
          total += expense.amount;
        }

        // Move to next month (same day)
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);

        // If we've passed the start date, break
        if (currentDate < start) break;
      }
    } else if (expense.type === "yearly") {
      // Yearly recurring: count once for each occurrence in range
      if (!expense.startDate) continue;

      const start = new Date(expense.startDate);
      const end = expense.endDate ? new Date(expense.endDate) : new Date("2099-12-31"); // Far future if no end date

      // Generate all yearly occurrences
      let currentDate = new Date(start);
      while (currentDate <= end && currentDate <= toDate) {
        // Check if this occurrence falls in the query range
        if (currentDate >= fromDate && currentDate <= toDate) {
          total += expense.amount;
        }

        // Move to next year (same month and day)
        currentDate = new Date(currentDate);
        currentDate.setFullYear(currentDate.getFullYear() + 1);

        // If we've passed the start date, break
        if (currentDate < start) break;
      }
    }
  }

  return total;
}
