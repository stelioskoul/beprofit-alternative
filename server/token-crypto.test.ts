import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./token-crypto";

const original = process.env.TOKEN_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
});
afterEach(() => {
  if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = original;
});

describe("provider access tokens", () => {
  it("encrypts with a random nonce and decrypts to the original token", () => {
    const one = encryptToken("shpat_secret-value");
    const two = encryptToken("shpat_secret-value");
    expect(one).not.toBe(two);
    expect(one).not.toContain("secret-value");
    expect(decryptToken(one)).toBe("shpat_secret-value");
  });
  it("rejects a corrupted authentication tag and plaintext", () => {
    const encrypted = encryptToken("sensitive");
    const data = Buffer.from(encrypted.slice(3), "base64");
    data[16] ^= 1;
    expect(() => decryptToken(`v1:${data.toString("base64")}`)).toThrow();
    expect(() => decryptToken("plaintext")).toThrow();
  });
  it("fails closed if the secret key is not configured", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("sensitive")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});
