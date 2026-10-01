import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const configured = process.env.TOKEN_ENCRYPTION_KEY;
  const key = configured ? Buffer.from(configured, "base64") : Buffer.alloc(0);
  if (key.length !== 32 || key.toString("base64") !== configured) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte secret");
  }
  return key;
}

export function validateTokenEncryptionKey(): void {
  encryptionKey();
}

export function encryptToken(token: string): string {
  if (!token) throw new Error("Empty provider access token");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith("v1:")) throw new Error("Unsupported or unencrypted provider token");
  const data = Buffer.from(stored.slice(3), "base64");
  if (data.length < 29) throw new Error("Invalid encrypted provider token");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
