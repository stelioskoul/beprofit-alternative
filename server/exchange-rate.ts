/**
 * Exchange Rate Service
 * Fetches live EUR/USD exchange rates from ExchangeRate-API
 */

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  time_last_update_unix: number;
  time_next_update_unix: number;
  rates: Record<string, number>;
}

let cachedRate: number | null = null;
let cacheExpiry: number = 0;

/**
 * Fetch live EUR/USD exchange rate
 * Caches the result for 24 hours to respect rate limits
 */
export async function getEurUsdRate(): Promise<number> {
  const now = Date.now();

  // Return cached rate if still valid
  if (cachedRate && now < cacheExpiry) {
    return cachedRate;
  }

  try {
    // Fetch from ExchangeRate-API (USD to EUR)
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();

    if (data.result !== "success" || !data.rates.EUR) {
      throw new Error("Invalid exchange rate API response");
    }

    // USD to EUR rate (e.g., 1 USD = 0.92 EUR means EUR/USD = 1.087)
    const usdToEur = data.rates.EUR;
    const eurToUsd = 1 / usdToEur;

    // Cache for 24 hours
    cachedRate = eurToUsd;
    cacheExpiry = data.time_next_update_unix * 1000;

    console.log(`[Exchange Rate] Updated EUR/USD rate: ${eurToUsd.toFixed(4)} (valid until ${new Date(cacheExpiry).toISOString()})`);

    return eurToUsd;
  } catch (error) {
    console.error("[Exchange Rate] Failed to fetch live rate:", error);

    // Fall back to environment variable or default
    const fallbackRate = parseFloat(process.env.EXCHANGE_RATE_EUR_USD || "1.08");
    console.warn(`[Exchange Rate] Using fallback rate: ${fallbackRate}`);

    return fallbackRate;
  }
}

/**
 * Get the current cached rate without fetching
 * Returns null if no rate is cached
 */
export function getCachedRate(): { rate: number; expiresAt: number } | null {
  if (cachedRate && Date.now() < cacheExpiry) {
    return {
      rate: cachedRate,
      expiresAt: cacheExpiry,
    };
  }
  return null;
}
