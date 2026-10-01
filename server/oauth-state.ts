import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "./_core/sdk";

export type OAuthProvider = "shopify" | "facebook";

export async function createOAuthState(
  provider: OAuthProvider,
  storeId: number,
  userId: number
): Promise<string> {
  if (!Number.isSafeInteger(storeId) || storeId <= 0) throw new Error("Invalid store id");
  return new SignJWT({ provider, storeId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("beprofit")
    .setAudience("beprofit-oauth")
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSessionSecret());
}

export async function verifyOAuthState(state: string, provider: OAuthProvider) {
  const { payload } = await jwtVerify(state, getSessionSecret(), {
    issuer: "beprofit",
    audience: "beprofit-oauth",
    algorithms: ["HS256"],
  });
  const userId = Number(payload.sub);
  const storeId = Number(payload.storeId);
  if (payload.provider !== provider || !Number.isSafeInteger(userId) || userId <= 0 ||
      !Number.isSafeInteger(storeId) || storeId <= 0) {
    throw new Error("Invalid OAuth state");
  }
  return { userId, storeId };
}
