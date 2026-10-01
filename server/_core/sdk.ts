import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookies } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";

const ISSUER = "beprofit";
const AUDIENCE = "beprofit-session";
const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export function getSessionUserId(req: Request): Promise<number | null> {
  const cookie = parseCookies(req.headers.cookie || "")[COOKIE_NAME];
  return verifySession(cookie);
}

async function verifySession(cookie: string | undefined): Promise<number | null> {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, getSessionSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    const id = Number(payload.sub);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export const sdk = {
  async createSessionToken(userId: string, options: { expiresInMs?: number; name?: string } = {}) {
    const id = Number(userId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid user id");
    const durationMs = Math.min(options.expiresInMs ?? MAX_SESSION_MS, MAX_SESSION_MS);
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(String(id))
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + durationMs) / 1000))
      .sign(getSessionSecret());
  },

  async authenticateRequest(req: Request) {
    const id = await getSessionUserId(req);
    if (!id) throw ForbiddenError("Invalid session cookie");
    const user = await db.getUserById(id);
    if (!user) throw ForbiddenError("User not found");
    return user;
  },
};
