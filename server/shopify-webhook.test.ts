import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { verifyWebhookHmac } from "./shopify-oauth";

describe("Shopify Webhook HMAC Verification", () => {
  it("verifies valid webhook HMAC signature", () => {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET!;
    
    // Sample webhook payload
    const payload = JSON.stringify({
      id: 12345,
      name: "#1001",
      email: "test@example.com",
    });
    
    // Generate expected HMAC
    const expectedHmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload, "utf8")
      .digest("base64");
    
    // Verify the HMAC
    const isValid = verifyWebhookHmac(payload, expectedHmac);
    
    expect(isValid).toBe(true);
  });
  
  it("rejects invalid webhook HMAC signature", () => {
    const payload = JSON.stringify({
      id: 12345,
      name: "#1001",
    });
    
    const invalidHmac = "invalid-hmac-signature";
    
    const isValid = verifyWebhookHmac(payload, invalidHmac);
    
    expect(isValid).toBe(false);
  });
  
  it("rejects tampered webhook payload", () => {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET!;
    
    const originalPayload = JSON.stringify({
      id: 12345,
      total: "100.00",
    });
    
    // Generate HMAC for original payload
    const hmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(originalPayload, "utf8")
      .digest("base64");
    
    // Tamper with the payload
    const tamperedPayload = JSON.stringify({
      id: 12345,
      total: "999.00", // Changed amount
    });
    
    // Verification should fail
    const isValid = verifyWebhookHmac(tamperedPayload, hmac);
    
    expect(isValid).toBe(false);
  });
});
