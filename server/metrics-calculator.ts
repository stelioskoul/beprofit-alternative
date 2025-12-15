/**
 * Metrics calculation logic extracted from routers.ts
 * This avoids circular dependencies when using caching
 */

import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { fetchShopifyOrders, fetchShopifyDisputes, fetchShopifyBalanceTransactions } from "./shopify-data";
import { fetchFacebookAdSpend } from "./facebook-data";
import { processOrders, calculateProcessingFees, calculateOperationalExpensesForPeriod } from "./profit-calculator";
import { getEurUsdRate } from "./exchange-rate";

export async function calculateMetrics(
  ctx: { user: { id: number } },
  input: { storeId: number; fromDate: string; toDate: string }
) {
  const store = await db.getStoreById(input.storeId);
  if (!store || store.userId !== ctx.user.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Store not found or access denied",
    });
  }

  const shopifyConn = await db.getShopifyConnectionByStoreId(input.storeId);
  const facebookConns = await db.getFacebookConnectionsByStoreId(input.storeId);

  // Initialize with zero values
  let orders: any[] = [];
  let disputes = { totalAmount: 0, count: 0 };
  let processed: any = { revenue: 0, totalCogs: 0, totalShipping: 0, ordersCount: 0, processedOrders: [] };
  let processingFees = 0;
  let totalDisputeValue = 0;
  let totalDisputeFees = 0;
  let totalRefunds = 0;
  let orderFees: Map<number, number> | undefined;

  // Get exchange rate for EUR to USD conversion
  const EXCHANGE_RATE_EUR_USD = await getEurUsdRate();

  // Fetch Shopify data if connected
  if (shopifyConn) {
    orders = await fetchShopifyOrders(
      shopifyConn.shopDomain,
      shopifyConn.accessToken,
      { fromDate: input.fromDate, toDate: input.toDate },
      store.timezoneOffset || -300,
      shopifyConn.apiVersion || "2025-10"
    );

    disputes = await fetchShopifyDisputes(
      shopifyConn.shopDomain,
      shopifyConn.accessToken,
      { fromDate: input.fromDate, toDate: input.toDate },
      store.timezoneOffset || -300,
      shopifyConn.apiVersion || "2025-10"
    );

    const cogsConfigList = await db.getCogsConfigByStoreId(input.storeId);
    const shippingConfigList = await db.getShippingConfigByStoreId(input.storeId);

    const cogsMap: Record<string, number> = {};
    for (const config of cogsConfigList) {
      const val = parseFloat(config.cogsValue);
      if (!isNaN(val)) {
        cogsMap[config.variantId] = val;
      }
    }

    const shippingMap: Record<string, any> = {};
    for (const config of shippingConfigList) {
      try {
        shippingMap[config.variantId] = JSON.parse(config.configJson || "{}");
      } catch (e) {
        console.error("Failed to parse shipping config:", e);
      }
    }

    // Fetch actual processing fees and disputes from Shopify balance transactions
    try {
      const balanceData = await fetchShopifyBalanceTransactions(
        shopifyConn.shopDomain,
        shopifyConn.accessToken,
        { fromDate: input.fromDate, toDate: input.toDate },
        shopifyConn.apiVersion || "2025-10",
        EXCHANGE_RATE_EUR_USD,
        store.timezoneOffset || -300
      );
      orderFees = balanceData.orderFees;
      totalDisputeValue = balanceData.totalDisputeValue;
      totalDisputeFees = balanceData.totalDisputeFees;
      totalRefunds = balanceData.totalRefunds;
    } catch (error) {
      console.error("Failed to fetch balance transactions, using calculated fees:", error);
    }

    processed = processOrders(orders, cogsMap, shippingMap, EXCHANGE_RATE_EUR_USD, orderFees);

    const processingFeesConfig = await db.getProcessingFeesConfigByStoreId(input.storeId);
    const percentFee = processingFeesConfig ? parseFloat(processingFeesConfig.percentFee || "0.028") : 0.028;
    const fixedFee = processingFeesConfig ? parseFloat(processingFeesConfig.fixedFee || "0.29") : 0.29;
    processingFees = calculateProcessingFees(processed.revenue, processed.ordersCount, percentFee, fixedFee);
  }

  // Fetch Facebook ad spend if connected
  let totalAdSpend = 0;
  for (const fbConn of facebookConns) {
    const { spend, currency } = await fetchFacebookAdSpend(
      fbConn.adAccountId,
      fbConn.accessToken,
      { fromDate: input.fromDate, toDate: input.toDate },
      fbConn.apiVersion || "v21.0"
    );

    if (currency === "USD") {
      totalAdSpend += spend / EXCHANGE_RATE_EUR_USD;
    } else {
      totalAdSpend += spend;
    }
  }

  const expenses = await db.getOperationalExpensesByStoreId(input.storeId);
  const fromDateObj = new Date(input.fromDate);
  const toDateObj = new Date(input.toDate);
  const operationalExpensesTotal = calculateOperationalExpensesForPeriod(
    expenses.map((e) => ({
      type: e.type,
      amount: parseFloat(e.amount),
      date: e.date,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
    fromDateObj,
    toDateObj
  );

  // Keep values in USD
  const revenueUSD = processed.revenue;
  const cogsUSD = processed.totalCogs;
  const shippingUSD = processed.totalShipping;
  const processingFeesUSD = processingFees;
  const disputeValueUSD = totalDisputeValue;
  const disputeFeesUSD = totalDisputeFees;
  const totalDisputesUSD = disputeValueUSD + disputeFeesUSD;
  const refundsUSD = totalRefunds;
  const adSpendUSD = totalAdSpend * EXCHANGE_RATE_EUR_USD;
  const operationalExpensesUSD = operationalExpensesTotal;

  const netProfitUSD =
    revenueUSD -
    cogsUSD -
    shippingUSD -
    processingFeesUSD -
    adSpendUSD -
    totalDisputesUSD -
    refundsUSD -
    operationalExpensesUSD;

  // Calculate average order profit margin
  let averageOrderProfitMargin = 0;
  let averageOrderProfit = 0;
  if (processed.processedOrders && processed.processedOrders.length > 0) {
    const orderMargins = processed.processedOrders.map((order: any) => {
      const orderRevenue = order.total;
      const orderProfit = order.profit;
      return orderRevenue > 0 ? (orderProfit / orderRevenue) * 100 : 0;
    });
    averageOrderProfitMargin = orderMargins.reduce((sum: number, margin: number) => sum + margin, 0) / orderMargins.length;

    const orderProfits = processed.processedOrders.map((order: any) => order.profit);
    averageOrderProfit = orderProfits.reduce((sum: number, profit: number) => sum + profit, 0) / orderProfits.length;
  }

  return {
    revenue: revenueUSD,
    orders: processed.ordersCount,
    cogs: cogsUSD,
    shipping: shippingUSD,
    processingFees: processingFeesUSD,
    adSpend: adSpendUSD,
    disputeValue: disputeValueUSD,
    disputeFees: disputeFeesUSD,
    refunds: refundsUSD,
    operationalExpenses: operationalExpensesUSD,
    netProfit: netProfitUSD,
    processedOrders: processed.processedOrders,
    averageOrderProfitMargin: averageOrderProfitMargin,
    averageOrderProfit: averageOrderProfit,
  };
}
