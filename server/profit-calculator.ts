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
  shippingConfig: ShippingConfigMap
): number {
  if (!item || !region || !shippingType) return 0;

  let quantity = item.quantity || 0;
  if (quantity <= 0) return 0;

  const key = getItemConfigKey(item);
  if (!key) return 0;

  const productConfig = shippingConfig[key];
  if (!productConfig) return 0;

  const typeConfig = productConfig[shippingType];
  if (!typeConfig) return 0;

  const regionConfig = typeConfig[region];
  if (!regionConfig) return 0;

  const keys = Object.keys(regionConfig)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  if (!keys.length) return 0;

  let total = 0;
  const maxKey = keys[keys.length - 1];

  // If within table range, treat as a single tier lookup.
  if (quantity <= maxKey) {
    const v = regionConfig[String(quantity)];
    const num = parseFloat(String(v));
    return isNaN(num) ? 0 : num;
  }

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

    const v = regionConfig[String(tier)];
    const num = parseFloat(String(v));
    if (!isNaN(num)) {
      total += num;
    }

    quantity -= tier;
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
  country: string | null;
  cogs: number;
  shippingCost: number;
  shippingType: string;
  region: string | null;
  items: LineItem[];
}

export function processOrders(
  orders: ShopifyOrder[],
  cogsConfig: CogsConfigMap,
  shippingConfig: ShippingConfigMap
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
      const itemShipping = region ? computeShippingForLineItem(item, region, shippingType, shippingConfig) : 0;
      
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

    processedOrders.push({
      id: "#" + (order.order_number || order.id),
      orderNumber: order.order_number,
      createdAt: order.created_at,
      customer: customerName,
      total: val,
      currency: order.currency || "USD",
      country: shippingCountry || null,
      cogs: orderCogs,
      shippingCost: orderShipping,
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
      if (expense.date) {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= fromDate && expenseDate <= toDate) {
          total += expense.amount;
        }
      }
    } else if (expense.type === "monthly" || expense.type === "yearly") {
      if (!expense.startDate) continue;

      const start = new Date(expense.startDate);
      const end = expense.endDate ? new Date(expense.endDate) : toDate;

      // Check if expense period overlaps with query period
      if (start <= toDate && end >= fromDate) {
        const effectiveStart = start > fromDate ? start : fromDate;
        const effectiveEnd = end < toDate ? end : toDate;

        const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (expense.type === "monthly") {
          // Approximate: 30 days per month
          const months = days / 30;
          total += expense.amount * months;
        } else if (expense.type === "yearly") {
          // Approximate: 365 days per year
          const years = days / 365;
          total += expense.amount * years;
        }
      }
    }
  }

  return total;
}
