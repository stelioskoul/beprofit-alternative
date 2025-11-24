/**
 * Tiered Pricing Calculation Utilities
 * Handles COGS and shipping calculations based on quantity tiers and regions
 */

export interface CogsTiers {
  "1": number;  // Price in cents for 1 item
  "2": number;  // Price in cents for 2 items
  "3": number;  // Price in cents for 3 items
  "4": number;  // Price in cents for 4+ items
}

export interface ShippingTiers {
  EU: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };
  USA: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };
  Canada: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };
  ROW: {  // Rest of World
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };
}

export type ShippingRegion = "EU" | "USA" | "Canada" | "ROW";

/**
 * Get the appropriate tier key based on quantity
 */
function getTierKey(quantity: number): "1" | "2" | "3" | "4" {
  if (quantity === 1) return "1";
  if (quantity === 2) return "2";
  if (quantity === 3) return "3";
  return "4"; // 4 or more
}

/**
 * Determine shipping region from country code
 */
export function getShippingRegion(countryCode: string): ShippingRegion {
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE"
  ];
  
  const upperCode = countryCode.toUpperCase();
  
  if (euCountries.includes(upperCode)) return "EU";
  if (upperCode === "US") return "USA";
  if (upperCode === "CA") return "Canada";
  return "ROW";
}

/**
 * Calculate COGS for a line item based on quantity and tiers
 */
export function calculateCOGS(
  quantity: number,
  cogsTiers: CogsTiers | null,
  fallbackCogs: number  // Simple COGS in cents if no tiers configured
): number {
  if (!cogsTiers) {
    // No tiers configured, use simple COGS * quantity
    return fallbackCogs * quantity;
  }
  
  try {
    const tierKey = getTierKey(quantity);
    const pricePerUnit = cogsTiers[tierKey];
    return pricePerUnit * quantity;
  } catch (error) {
    console.error("Error calculating COGS:", error);
    return fallbackCogs * quantity;
  }
}

/**
 * Calculate shipping cost for a line item based on quantity, region, and tiers
 */
export function calculateShipping(
  quantity: number,
  region: ShippingRegion,
  shippingTiers: ShippingTiers | null,
  fallbackShipping: number  // Simple shipping in cents if no tiers configured
): number {
  if (!shippingTiers || !shippingTiers[region]) {
    // No tiers configured, use simple shipping cost
    return fallbackShipping;
  }
  
  try {
    const tierKey = getTierKey(quantity);
    const regionTiers = shippingTiers[region];
    return regionTiers[tierKey];
  } catch (error) {
    console.error("Error calculating shipping:", error);
    return fallbackShipping;
  }
}

/**
 * Calculate total COGS and shipping for an entire order
 */
export interface OrderLineItem {
  variantId: string;
  quantity: number;
  productId?: number;
  cogsTiers?: string | null;  // JSON string
  shippingTiers?: string | null;  // JSON string
  fallbackCogs?: number;  // cents
  fallbackShipping?: number;  // cents
}

export interface OrderCalculation {
  totalCOGS: number;  // cents
  totalShipping: number;  // cents
  lineItemBreakdown: Array<{
    variantId: string;
    quantity: number;
    cogs: number;
    shipping: number;
  }>;
}

export function calculateOrderCostsAndShipping(
  lineItems: OrderLineItem[],
  shippingCountryCode: string
): OrderCalculation {
  const region = getShippingRegion(shippingCountryCode);
  let totalCOGS = 0;
  let totalShipping = 0;
  const lineItemBreakdown: OrderCalculation["lineItemBreakdown"] = [];
  
  for (const item of lineItems) {
    // Parse tiers if available
    let cogsTiers: CogsTiers | null = null;
    let shippingTiers: ShippingTiers | null = null;
    
    if (item.cogsTiers) {
      try {
        cogsTiers = JSON.parse(item.cogsTiers);
      } catch (e) {
        console.error("Failed to parse cogsTiers:", e);
      }
    }
    
    if (item.shippingTiers) {
      try {
        shippingTiers = JSON.parse(item.shippingTiers);
      } catch (e) {
        console.error("Failed to parse shippingTiers:", e);
      }
    }
    
    // Calculate COGS for this line item
    const itemCOGS = calculateCOGS(
      item.quantity,
      cogsTiers,
      item.fallbackCogs || 0
    );
    
    // Calculate shipping for this line item
    const itemShipping = calculateShipping(
      item.quantity,
      region,
      shippingTiers,
      item.fallbackShipping || 0
    );
    
    totalCOGS += itemCOGS;
    totalShipping += itemShipping;
    
    lineItemBreakdown.push({
      variantId: item.variantId,
      quantity: item.quantity,
      cogs: itemCOGS,
      shipping: itemShipping,
    });
  }
  
  return {
    totalCOGS,
    totalShipping,
    lineItemBreakdown,
  };
}
