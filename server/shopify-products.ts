/**
 * Shopify Products Import
 * Fetches product data from Shopify to sync SKUs
 */

import { getApiCredential } from "./db";
import { decrypt } from "./utils";

interface ShopifyVariant {
  id: number;
  sku: string;
  title: string;
  price: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ImportedProduct {
  sku: string;
  variantId: string;
  productName: string;
  price: number; // in cents
}

export async function getShopifyProducts(): Promise<ImportedProduct[]> {
  try {
    console.log("[Shopify Products] Starting import...");
    // Get credentials
    const credential = await getApiCredential("shopify");
    console.log("[Shopify Products] Credential check:", {
      hasCredential: !!credential,
      hasAccessToken: !!credential?.accessToken,
      hasStoreDomain: !!credential?.storeDomain,
      storeDomain: credential?.storeDomain
    });
    if (!credential?.accessToken || !credential?.storeDomain) {
      throw new Error("Shopify credentials not configured");
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    // Fetch all products from Shopify
    const url = `https://${storeDomain}/admin/api/2024-01/products.json?limit=250`;
    
    console.log("[Shopify Products] Fetching from URL:", url);
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    console.log("[Shopify Products] Response status:", response.status);
    if (!response.ok) {
      const error = await response.text();
      console.error("[Shopify Products] API error:", error);
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    const data: ShopifyProductsResponse = await response.json();
    console.log("[Shopify Products] Received products:", data.products?.length || 0);
    
    // Extract SKUs from all product variants
    const products: ImportedProduct[] = [];
    
    for (const product of data.products || []) {
      for (const variant of product.variants || []) {
        // Use existing SKU or generate one from variant ID
        const sku = variant.sku || `SHOPIFY-${variant.id}`;
        
        products.push({
          sku: sku,
          variantId: String(variant.id),
          productName: product.variants.length > 1 
            ? `${product.title} - ${variant.title}`
            : product.title,
          price: Math.round(parseFloat(variant.price || "0") * 100), // Convert to cents
        });
      }
    }

    console.log("[Shopify Products] Extracted products with SKUs:", products.length);
    return products;
  } catch (error) {
    console.error("[Shopify Products] Failed to fetch products:", error);
    throw error;
  }
}
