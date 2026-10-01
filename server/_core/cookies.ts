import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  // Preview and published sites terminate TLS at a reverse proxy. APP_URL is
  // authoritative for deployed HTTPS even if the internal request uses HTTP.
  const forwarded = req.headers["x-forwarded-proto"];
  const proxyHttps = (Array.isArray(forwarded) ? forwarded : [forwarded])
    .some(value => value?.split(",").some(proto => proto.trim() === "https"));
  const secure = process.env.APP_URL?.startsWith("https://") || req.secure || req.protocol === "https" || proxyHttps;

  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure: Boolean(secure),
  };
}
