/**
 * Facebook Marketing API data fetching utilities
 * Migrated from original Netlify functions
 */

interface DateRange {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
}

export async function fetchFacebookAdSpend(
  adAccountId: string,
  accessToken: string,
  dateRange: DateRange,
  apiVersion: string = "v21.0"
): Promise<{ spend: number; currency: string }> {
  // Ensure account ID has act_ prefix
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const url = new URL(`https://graph.facebook.com/${apiVersion}/${accountId}/insights`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "spend");
  url.searchParams.set(
    "time_range",
    JSON.stringify({ since: dateRange.fromDate, until: dateRange.toDate })
  );
  url.searchParams.set("level", "account");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  let spend = 0;

  if (Array.isArray(data.data) && data.data.length > 0) {
    const val = parseFloat(data.data[0].spend || "0");
    spend = isNaN(val) ? 0 : val;
  }

  // Get account currency
  const accountUrl = new URL(`https://graph.facebook.com/${apiVersion}/${accountId}`);
  accountUrl.searchParams.set("access_token", accessToken);
  accountUrl.searchParams.set("fields", "currency");

  const accountRes = await fetch(accountUrl.toString());
  let currency = "EUR"; // Default to EUR

  if (accountRes.ok) {
    const accountData = await accountRes.json();
    currency = accountData.currency || "EUR";
  }

  return { spend, currency };
}
