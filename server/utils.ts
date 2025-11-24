/**
 * Utility functions for profit calculations, currency conversion, and API integrations
 */

import { Expense } from "../drizzle/schema";
import { getCacheValue, setCacheValue } from "./db";

// ============= Currency Conversion =============

const EXCHANGE_RATE_API = "https://api.exchangerate-api.com/v4/latest/USD";
const CACHE_TTL_HOURS = 24;

export async function getExchangeRate(from: string = "USD", to: string = "EUR"): Promise<number> {
  const cacheKey = `exchange_rate_${from}_${to}`;
  
  // Check cache first
  const cached = await getCacheValue(cacheKey);
  if (cached) {
    return parseFloat(cached);
  }
  
  // Fetch from API
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    const data = await response.json();
    const rate = data.rates[to] / data.rates[from];
    
    // Cache for 24 hours
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    await setCacheValue(cacheKey, rate.toString(), expiresAt);
    
    return rate;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    // Return default rate if API fails
    return 0.92; // Approximate USD to EUR
  }
}

export function convertCurrency(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate);
}

export function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(2)}`;
}

// ============= Date Utilities =============

export function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = formatDate(now);
  
  switch (period) {
    case "today":
      return { startDate: today, endDate: today };
      
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      return { startDate: yesterdayStr, endDate: yesterdayStr };
    }
      
    case "this_week": {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return { startDate: formatDate(startOfWeek), endDate: today };
    }
      
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDate(startOfMonth), endDate: today };
    }
      
    case "last_30_days": {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { startDate: formatDate(thirtyDaysAgo), endDate: today };
    }
      
    default:
      return { startDate: today, endDate: today };
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

// ============= Expense Calculations =============

export function calculateExpenseForPeriod(
  expense: Expense,
  startDate: string,
  endDate: string
): number {
  if (expense.expenseType === "one_time") {
    // One-time expense: include if date falls within period
    if (expense.date && isDateInRange(expense.date, startDate, endDate)) {
      return expense.amount;
    }
    return 0;
  }
  
  // Recurring expenses (monthly or yearly)
  const expenseStart = expense.startDate || startDate;
  const expenseEnd = expense.endDate || endDate;
  
  // Check if expense period overlaps with query period
  if (expenseStart > endDate || expenseEnd < startDate) {
    return 0;
  }
  
  // Calculate overlap period
  const overlapStart = expenseStart > startDate ? expenseStart : startDate;
  const overlapEnd = expenseEnd < endDate ? expenseEnd : endDate;
  
  const overlapDays = daysBetween(overlapStart, overlapEnd) + 1;
  
  if (expense.expenseType === "monthly") {
    // Prorate monthly expense based on days
    const daysInMonth = 30; // Average
    return Math.round((expense.amount / daysInMonth) * overlapDays);
  } else {
    // Prorate yearly expense based on days
    const daysInYear = 365;
    return Math.round((expense.amount / daysInYear) * overlapDays);
  }
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============= Metrics Calculation =============

export interface MetricsData {
  revenue: number;
  adSpend: number;
  cogs: number;
  shipping: number;
  processingFees: number;
  grossProfit: number;
  operationalExpenses: number;
  disputes: number;
  netProfit: number;
  profitMargin: number;
  orders: number;
}

export function calculateMetrics(params: {
  revenue: number;
  adSpend: number;
  cogs: number;
  shipping: number;
  processingFees: number;
  operationalExpenses: number;
  disputes: number;
  orders: number;
}): MetricsData {
  const grossProfit = params.revenue - params.cogs - params.shipping - params.processingFees;
  const netProfit = grossProfit - params.adSpend - params.operationalExpenses - params.disputes;
  const profitMargin = params.revenue > 0 ? (netProfit / params.revenue) * 100 : 0;
  
  return {
    revenue: params.revenue,
    adSpend: params.adSpend,
    cogs: params.cogs,
    shipping: params.shipping,
    processingFees: params.processingFees,
    grossProfit,
    operationalExpenses: params.operationalExpenses,
    disputes: params.disputes,
    netProfit,
    profitMargin,
    orders: params.orders,
  };
}

// ============= CSV Parsing =============

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0]!.split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// ============= Encryption (Simple Base64 for demo) =============
// In production, use proper encryption library

export function encrypt(text: string): string {
  return Buffer.from(text).toString('base64');
}

export function decrypt(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}
