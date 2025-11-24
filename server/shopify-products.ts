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
  productName: string;
  price: number; // in cents
}

export async function getShopifyProducts(): Promise<ImportedProduct[]> {
  try {
    // Get credentials
    const credential = await getApiCredential("shopify");
    if (!credential?.accessToken || !credential?.storeDomain) {
      throw new Error("Shopify credentials not configured");
    }

    const accessToken = decrypt(credential.accessToken);
    const storeDomain = credential.storeDomain;

    // Fetch all products from Shopify
    const url = `https://${storeDomain}/admin/api/2024-01/products.json?limit=250`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Shopify Products] API error:", error);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data: ShopifyProductsResponse = await response.json();
    
    // Extract SKUs from all product variants
    const products: ImportedProduct[] = [];
    
    for (const product of data.products || []) {
      for (const variant of product.variants || []) {
        if (variant.sku) { // Only include variants with SKUs
          products.push({
            sku: variant.sku,
            productName: product.variants.length > 1 
              ? `${product.title} - ${variant.title}`
              : product.title,
            price: Math.round(parseFloat(variant.price || "0") * 100), // Convert to cents
          });
        }
      }
    }

    return products;
  } catch (error) {
    console.error("[Shopify Products] Failed to fetch products:", error);
    throw error;
  }
}
