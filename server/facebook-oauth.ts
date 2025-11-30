/**
 * Facebook OAuth utilities
 * Handles OAuth flow for Facebook Marketing API access
 */

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const FACEBOOK_SCOPES = "ads_read,ads_management,read_insights";

export function getFacebookAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    state,
    scope: FACEBOOK_SCOPES,
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const url = `https://graph.facebook.com/v21.0/oauth/access_token`;

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${url}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook token exchange failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const url = `https://graph.facebook.com/v21.0/oauth/access_token`;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${url}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook long-lived token exchange failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function getFacebookAdAccounts(accessToken: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v21.0/me/adaccounts`;

  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,account_status,currency,timezone_name",
  });

  const response = await fetch(`${url}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch ad accounts: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data || [];
}
