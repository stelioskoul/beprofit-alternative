/**
 * Shipping Calculator
 * 
 * Calculates shipping costs based on country-specific, method-specific, and quantity-based pricing matrices.
 * Supports USD and EUR input with automatic conversion.
 */

type ShippingMethod = "Standard" | "Express";
type Country = "US" | "EU" | "CA";
type QuantityPricing = Record<number, number>;
type MethodPricing = Record<ShippingMethod, QuantityPricing>;
type CountryPricing = Record<Country, MethodPricing>;

interface ShippingCalculationInput {
  variantId: string;
  quantity: number;
  shippingMethod?: string; // From Shopify order
  destinationCountry?: string; // From Shopify order shipping address
  shippingConfig: CountryPricing;
  exchangeRate: number; // EUR/USD rate
}

/**
 * Map Shopify shipping method to our standard methods
 */
function normalizeShippingMethod(shopifyMethod?: string): ShippingMethod {
  if (!shopifyMethod) return "Standard";
  
  const method = shopifyMethod.toLowerCase();
  if (method.includes("express") || method.includes("expedited") || method.includes("priority")) {
    return "Express";
  }
  return "Standard";
}

/**
 * Map Shopify country code to our country groups
 */
function normalizeCountry(countryCode?: string): Country {
  if (!countryCode) return "US";
  
  const code = countryCode.toUpperCase();
  
  // EU countries
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE"
  ];
  
  if (euCountries.includes(code)) return "EU";
  if (code === "CA") return "CA";
  return "US"; // Default to US
}

/**
 * Calculate shipping cost for a line item
 */
export function calculateShippingCost(input: ShippingCalculationInput): number {
  const {
    quantity,
    shippingMethod,
    destinationCountry,
    shippingConfig,
    exchangeRate,
  } = input;

  // Normalize inputs
  const method = normalizeShippingMethod(shippingMethod);
  const country = normalizeCountry(destinationCountry);

  // Get pricing for this country and method
  const methodPricing = shippingConfig[country]?.[method];
  if (!methodPricing) {
    console.warn(`No shipping config found for ${country} - ${method}`);
    return 0;
  }

  // Find the exact quantity or the closest lower quantity
  const quantities = Object.keys(methodPricing).map(Number).sort((a, b) => a - b);
  if (quantities.length === 0) return 0;

  let applicableQuantity = quantities[0];
  for (const qty of quantities) {
    if (qty <= quantity) {
      applicableQuantity = qty;
    } else {
      break;
    }
  }

  const costInInputCurrency = methodPricing[applicableQuantity] || 0;

  // Convert to EUR if needed (assume input is in USD for US/CA, EUR for EU)
  if (country === "EU") {
    return costInInputCurrency; // Already in EUR
  } else {
    // Convert from USD to EUR
    return costInInputCurrency / exchangeRate;
  }
}

/**
 * Calculate total shipping cost for an order
 */
export function calculateOrderShipping(
  lineItems: Array<{
    variantId: string;
    quantity: number;
  }>,
  shippingMethod: string | undefined,
  destinationCountry: string | undefined,
  shippingConfigs: Map<string, CountryPricing>,
  exchangeRate: number
): number {
  let totalShipping = 0;

  for (const item of lineItems) {
    const config = shippingConfigs.get(item.variantId);
    if (!config) continue;

    const itemShipping = calculateShippingCost({
      variantId: item.variantId,
      quantity: item.quantity,
      shippingMethod,
      destinationCountry,
      shippingConfig: config,
      exchangeRate,
    });

    totalShipping += itemShipping;
  }

  return totalShipping;
}
