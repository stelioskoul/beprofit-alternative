import Papa from "papaparse";

/**
 * Generate CSV template with actual products data for COGS bulk import/export
 */
export async function generateCogsTemplate(storeId: number): Promise<string> {
  const db = await import("./db");
  
  // Get store and Shopify connection
  const store = await db.getStoreById(storeId);
  if (!store) throw new Error("Store not found");
  
  const shopifyConn = await db.getShopifyConnectionByStoreId(storeId);
  if (!shopifyConn) throw new Error("Shopify connection not found");
  
  // Fetch ALL products from Shopify with pagination (same as products.list)
  const allProducts: any[] = [];
  let nextPageInfo: string | null = null;
  let pageCount = 0;
  const MAX_PAGES = 20;

  while (pageCount < MAX_PAGES) {
    pageCount++;
    const url = new URL(`https://${shopifyConn.shopDomain}/admin/api/${shopifyConn.apiVersion || "2025-10"}/products.json`);
    
    if (nextPageInfo) {
      url.searchParams.set("page_info", nextPageInfo);
      url.searchParams.set("limit", "250");
    } else {
      url.searchParams.set("limit", "250");
    }

    const response = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": shopifyConn.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch products from Shopify");
    }

    const data = await response.json();
    const products = data.products || [];
    allProducts.push(...products);

    // Check for next page
    const linkHeader = response.headers.get("link");
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>; rel="next"/);
      if (nextMatch) {
        nextPageInfo = nextMatch[1];
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  const products = allProducts;
  
  // Get existing COGS configurations
  const cogsConfigs = await db.getCogsConfigByStoreId(storeId);
  const cogsMap = new Map(cogsConfigs.map((c: any) => [c.variantId, c.cogsValue]));
  
  // Get shipping profile assignments
  const { shippingConfig } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  
  const shippingAssignments = await database
    .select()
    .from(shippingConfig)
    .where(eq(shippingConfig.storeId, storeId));
  
  const shippingMap = new Map();
  for (const assignment of shippingAssignments) {
    try {
      const config = JSON.parse(assignment.configJson);
      if (config.profileId) {
        shippingMap.set(assignment.variantId, config.profileId);
      }
    } catch {}
  }
  
  // Get shipping profiles to map ID to name
  const profiles = await db.getShippingProfilesByStoreId(storeId);
  const profileMap = new Map(profiles.map((p: any) => [p.id, p.name]));
  
  // Build CSV rows
  const rows: any[] = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      const variantId = variant.id.toString();
      const cogsValue = cogsMap.get(variantId) || "";
      const profileId = shippingMap.get(variantId);
      const profileName = profileId ? profileMap.get(profileId) || "" : "";
      
      rows.push({
        "SKU": variant.sku || "",
        "Product Title": product.title,
        "Variant Title": variant.title,
        "Variant ID": variantId,
        "Current COGS (USD)": cogsValue,
        "Shipping Profile Name": profileName,
      });
    }
  }
  
  return Papa.unparse(rows);
}

/**
 * Generate CSV template with actual shipping profiles for bulk import/export
 */
export async function generateShippingTemplate(storeId: number): Promise<string> {
  const db = await import("./db");
  
  // Get all shipping profiles
  const profiles = await db.getShippingProfilesByStoreId(storeId);
  
  const rows: any[] = [];
  for (const profile of profiles) {
    let config: any = {};
    try {
      config = JSON.parse(profile.configJson);
    } catch {
      config = {};
    }
    
    // Export each quantity tier, country, and method as a separate row
    const tiers = config.quantityTiers || [];
    
    if (tiers.length === 0) {
      // Empty profile, add placeholder row
      rows.push({
        "Profile Name": profile.name,
        "Min Quantity": 1,
        "Max Quantity": 999,
        "Country Code": "ALL",
        "Country Name": "All Countries",
        "Shipping Method": "Standard",
        "Cost (USD)": 0,
      });
      continue;
    }
    
    for (const tier of tiers) {
      const countries = tier.countries || [];
      
      if (countries.length === 0) {
        // No countries, add placeholder
        rows.push({
          "Profile Name": profile.name,
          "Min Quantity": tier.minQuantity || 1,
          "Max Quantity": tier.maxQuantity || 999,
          "Country Code": "ALL",
          "Country Name": "All Countries",
          "Shipping Method": "Standard",
          "Cost (USD)": 0,
        });
        continue;
      }
      
      for (const country of countries) {
        const methods = country.methods || [];
        
        if (methods.length === 0) {
          // No methods, add placeholder
          rows.push({
            "Profile Name": profile.name,
            "Min Quantity": tier.minQuantity || 1,
            "Max Quantity": tier.maxQuantity || 999,
            "Country Code": country.code || "ALL",
            "Country Name": country.name || "All Countries",
            "Shipping Method": "Standard",
            "Cost (USD)": 0,
          });
          continue;
        }
        
        for (const method of methods) {
          rows.push({
            "Profile Name": profile.name,
            "Min Quantity": tier.minQuantity || 1,
            "Max Quantity": tier.maxQuantity || 999,
            "Country Code": country.code || "ALL",
            "Country Name": country.name || "All Countries",
            "Shipping Method": method.name || "Standard",
            "Cost (USD)": method.cost || 0,
          });
        }
      }
    }
  }
  
  return Papa.unparse(rows);
}

/**
 * Generate CSV template with actual expenses for bulk import/export
 */
export async function generateExpensesTemplate(storeId: number): Promise<string> {
  const db = await import("./db");
  const { operationalExpenses } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  // Get all expenses
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  
  const expenses = await database
    .select()
    .from(operationalExpenses)
    .where(eq(operationalExpenses.storeId, storeId));
  
  const rows: any[] = expenses.map((exp: any) => ({
    "Name": exp.title,
    "Amount (USD)": parseFloat(exp.amount),
    "Type": exp.type,
    "Date": exp.date || "",
    "Start Date": exp.startDate || "",
    "End Date": exp.endDate || "",
    "Is Active": exp.isActive ? "true" : "false",
  }));
  
  return Papa.unparse(rows);
}

/**
 * Parse COGS CSV data
 */
export function parseCogsCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors.map(e => e.message) };
  }
  
  const data = parsed.data as any[];
  if (data.length === 0) {
    return { success: false, errors: ["CSV file is empty"] };
  }
  
  // Validate required columns
  const firstRow = data[0];
  const requiredColumns = ["Variant ID", "Current COGS (USD)"];
  const missing = requiredColumns.filter(col => !(col in firstRow));
  if (missing.length > 0) {
    return { success: false, errors: [`Missing required columns: ${missing.join(", ")}`] };
  }
  
  return { success: true, data };
}

/**
 * Parse Shipping Profiles CSV data
 */
export function parseShippingCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors.map(e => e.message) };
  }
  
  const data = parsed.data as any[];
  if (data.length === 0) {
    return { success: false, errors: ["CSV file is empty"] };
  }
  
  // Validate required columns
  const firstRow = data[0];
  const requiredColumns = ["Profile Name", "Min Quantity", "Max Quantity", "Cost (USD)"];
  const missing = requiredColumns.filter(col => !(col in firstRow));
  if (missing.length > 0) {
    return { success: false, errors: [`Missing required columns: ${missing.join(", ")}`] };
  }
  
  return { success: true, data };
}

/**
 * Parse Expenses CSV data
 */
export function parseExpensesCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors.map(e => e.message) };
  }
  
  const data = parsed.data as any[];
  if (data.length === 0) {
    return { success: false, errors: ["CSV file is empty"] };
  }
  
  // Validate required columns
  const firstRow = data[0];
  const requiredColumns = ["Name", "Amount (USD)", "Type"];
  const missing = requiredColumns.filter(col => !(col in firstRow));
  if (missing.length > 0) {
    return { success: false, errors: [`Missing required columns: ${missing.join(", ")}`] };
  }
  
  return { success: true, data };
}
