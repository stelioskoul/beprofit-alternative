/**
 * CSV Helper for bulk import/export operations
 */

/**
 * Generate CSV template for COGS bulk import
 */
export function generateCogsTemplate(): string {
  const headers = ["SKU", "Product Name", "COGS Value (EUR)", "Currency"];
  const exampleRow = ["12345678", "Example Product", "15.50", "EUR"];
  
  return [headers.join(","), exampleRow.join(",")].join("\n");
}

/**
 * Generate CSV template for Shipping Profiles bulk import
 */
export function generateShippingTemplate(): string {
  const headers = ["SKU", "Product Name", "Shipping Profile", "Base Cost (EUR)", "Per Unit Cost (EUR)"];
  const exampleRow = ["12345678", "Example Product", "Standard", "3.50", "0.50"];
  
  return [headers.join(","), exampleRow.join(",")].join("\n");
}

/**
 * Generate CSV template for Operational Expenses bulk import
 */
export function generateExpensesTemplate(): string {
  const headers = ["Title", "Amount", "Currency", "Type", "Date (YYYY-MM-DD)", "Start Date (YYYY-MM-DD)", "End Date (YYYY-MM-DD)", "Active"];
  const exampleRow1 = ["Office Rent", "1500", "USD", "monthly", "", "2025-01-01", "2025-12-31", "true"];
  const exampleRow2 = ["Marketing Campaign", "500", "EUR", "one_time", "2025-01-15", "", "", "true"];
  
  return [headers.join(","), exampleRow1.join(","), exampleRow2.join(",")].join("\n");
}

/**
 * Parse COGS CSV data
 */
export function parseCogsCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: false, errors: ["CSV file is empty or has no data rows"] };
  }

  const headers = lines[0].split(",").map(h => h.trim());
  const expectedHeaders = ["SKU", "Product Name", "COGS Value (EUR)", "Currency"];
  
  // Validate headers
  if (!expectedHeaders.every(h => headers.includes(h))) {
    return { success: false, errors: [`Invalid headers. Expected: ${expectedHeaders.join(", ")}`] };
  }

  const data: any[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map(v => v.trim());
    const sku = values[0];
    const productName = values[1];
    const cogsValue = values[2];
    const currency = values[3] || "EUR";

    // Validate row
    if (!sku) {
      errors.push(`Row ${i + 1}: SKU is required`);
      continue;
    }
    if (!cogsValue || isNaN(parseFloat(cogsValue))) {
      errors.push(`Row ${i + 1}: Invalid COGS value "${cogsValue}"`);
      continue;
    }

    data.push({
      variantId: sku,
      productTitle: productName || null,
      cogsValue: parseFloat(cogsValue),
      currency: currency.toUpperCase(),
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

/**
 * Parse Shipping Profiles CSV data
 */
export function parseShippingCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: false, errors: ["CSV file is empty or has no data rows"] };
  }

  const headers = lines[0].split(",").map(h => h.trim());
  const expectedHeaders = ["SKU", "Product Name", "Shipping Profile", "Base Cost (EUR)", "Per Unit Cost (EUR)"];
  
  if (!expectedHeaders.every(h => headers.includes(h))) {
    return { success: false, errors: [`Invalid headers. Expected: ${expectedHeaders.join(", ")}`] };
  }

  const data: any[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map(v => v.trim());
    const sku = values[0];
    const productName = values[1];
    const profileName = values[2];
    const baseCost = values[3];
    const perUnitCost = values[4];

    if (!sku) {
      errors.push(`Row ${i + 1}: SKU is required`);
      continue;
    }
    if (!profileName) {
      errors.push(`Row ${i + 1}: Shipping Profile is required`);
      continue;
    }
    if (!baseCost || isNaN(parseFloat(baseCost))) {
      errors.push(`Row ${i + 1}: Invalid Base Cost "${baseCost}"`);
      continue;
    }
    if (!perUnitCost || isNaN(parseFloat(perUnitCost))) {
      errors.push(`Row ${i + 1}: Invalid Per Unit Cost "${perUnitCost}"`);
      continue;
    }

    data.push({
      variantId: sku,
      productTitle: productName || null,
      configJson: JSON.stringify({
        profileName,
        baseCost: parseFloat(baseCost),
        perUnitCost: parseFloat(perUnitCost),
      }),
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

/**
 * Parse Operational Expenses CSV data
 */
export function parseExpensesCSV(csvText: string): { success: boolean; data?: any[]; errors?: string[] } {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: false, errors: ["CSV file is empty or has no data rows"] };
  }

  const headers = lines[0].split(",").map(h => h.trim());
  const expectedHeaders = ["Title", "Amount", "Currency", "Type", "Date (YYYY-MM-DD)", "Start Date (YYYY-MM-DD)", "End Date (YYYY-MM-DD)", "Active"];
  
  if (!expectedHeaders.every(h => headers.includes(h))) {
    return { success: false, errors: [`Invalid headers. Expected: ${expectedHeaders.join(", ")}`] };
  }

  const data: any[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map(v => v.trim());
    const title = values[0];
    const amount = values[1];
    const currency = values[2] || "USD";
    const type = values[3];
    const date = values[4];
    const startDate = values[5];
    const endDate = values[6];
    const active = values[7] || "true";

    if (!title) {
      errors.push(`Row ${i + 1}: Title is required`);
      continue;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      errors.push(`Row ${i + 1}: Invalid Amount "${amount}"`);
      continue;
    }
    if (!["one_time", "monthly", "yearly"].includes(type)) {
      errors.push(`Row ${i + 1}: Type must be one of: one_time, monthly, yearly`);
      continue;
    }
    if (!["USD", "EUR"].includes(currency.toUpperCase())) {
      errors.push(`Row ${i + 1}: Currency must be USD or EUR`);
      continue;
    }

    data.push({
      title,
      amount,
      currency: currency.toUpperCase(),
      type,
      date: date || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isActive: active.toLowerCase() === "true" ? 1 : 0,
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
