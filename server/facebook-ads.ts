/**
 * Facebook Ads API Integration
 * Fetches ad spend data from Facebook Marketing API
 */

import { getApiCredential, getCacheValue, setCacheValue } from "./db";
import { decrypt } from "./utils";

const FACEBOOK_API_VERSION = "v21.0";
const FACEBOOK_API_BASE = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

interface FacebookAdSpendResponse {
  data: Array<{
    spend: string;
    date_start: string;
    date_stop: string;
  }>;
}

export async function getFacebookAdSpend(startDate: string, endDate: string): Promise<number> {
  try {
    // Get credentials
    const credential = await getApiCredential("facebook");
    if (!credential?.accessToken || !credential?.accountId) {
      console.warn("[Facebook] No credentials configured");
      return 0;
    }

    const accessToken = decrypt(credential.accessToken);
    const accountId = credential.accountId;

    // Check cache first (cache for 1 hour)
    const cacheKey = `fb_adspend_${accountId}_${startDate}_${endDate}`;
    const cached = await getCacheValue(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }

    // Fetch from Facebook API
    const url = new URL(`${FACEBOOK_API_BASE}/${accountId}/insights`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "spend");
    url.searchParams.set("time_range", JSON.stringify({
      since: startDate,
      until: endDate,
    }));
    url.searchParams.set("level", "account");
    url.searchParams.set("time_increment", "all_days");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[Facebook] API error:", error);
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data: FacebookAdSpendResponse = await response.json();
    
    // Calculate total spend (in cents, convert from dollars)
    let totalSpend = 0;
    if (data.data && data.data.length > 0) {
      for (const item of data.data) {
        totalSpend += parseFloat(item.spend || "0");
      }
    }

    // Convert to cents
    const spendCents = Math.round(totalSpend * 100);

    // Cache the result
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await setCacheValue(cacheKey, spendCents.toString(), expiresAt);

    return spendCents;
  } catch (error) {
    console.error("[Facebook] Failed to fetch ad spend:", error);
    return 0; // Return 0 on error instead of throwing
  }
}
