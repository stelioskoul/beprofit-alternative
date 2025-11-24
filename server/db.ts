import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  products, InsertProduct, Product,
  expenses, InsertExpense, Expense,
  disputes, InsertDispute, Dispute,
  apiCredentials, InsertApiCredential, ApiCredential,
  cache, InsertCache, Cache,
  shopifyOrders, shopifyOrderItems, shopifyRefunds
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= Products =============

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
}

export async function createProduct(product: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values(product);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(products).where(eq(products.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function updateProduct(sku: string, updates: Partial<InsertProduct>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(updates).where(eq(products.sku, sku));
}

export async function deleteProduct(sku: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.sku, sku));
}

// ============= Expenses =============

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function createExpense(expense: InsertExpense): Promise<Expense> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(expenses).values(expense);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(expenses).where(eq(expenses.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpensesForPeriod(startDate: string, endDate: string): Promise<Expense[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all expenses and filter in application logic
  // This is needed because we need to handle recurring expenses
  return await db.select().from(expenses);
}

// ============= Disputes =============

export async function getAllDisputes(): Promise<Dispute[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(disputes).orderBy(desc(disputes.createdAt));
}

export async function createDispute(dispute: InsertDispute): Promise<Dispute> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(disputes).values(dispute);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(disputes).where(eq(disputes.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function deleteDispute(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(disputes).where(eq(disputes.id, id));
}

export async function getDisputesForPeriod(startDate: string, endDate: string): Promise<Dispute[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get disputes that overlap with the period
  return await db.select().from(disputes).where(
    and(
      lte(disputes.startDate, endDate),
      gte(disputes.endDate, startDate)
    )
  );
}

// ============= API Credentials =============

export async function getApiCredential(service: string): Promise<ApiCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(apiCredentials).where(eq(apiCredentials.service, service)).limit(1);
  return result[0];
}

export async function upsertApiCredential(credential: InsertApiCredential): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(apiCredentials).values(credential).onDuplicateKeyUpdate({
    set: {
      accessToken: credential.accessToken,
      accountId: credential.accountId,
      storeDomain: credential.storeDomain,
      updatedAt: new Date(),
    },
  });
}

// ============= Cache =============

export async function getCacheValue(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(cache).where(
    and(
      eq(cache.cacheKey, key),
      gte(cache.expiresAt, new Date())
    )
  ).limit(1);
  
  return result[0]?.cacheValue ?? null;
}

export async function setCacheValue(key: string, value: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(cache).values({
    cacheKey: key,
    cacheValue: value,
    expiresAt,
  }).onDuplicateKeyUpdate({
    set: {
      cacheValue: value,
      expiresAt,
    },
  });
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(cache).where(
    lte(cache.expiresAt, new Date())
  );
}

// ============= Shopify Webhooks Data =============

/**
 * Get Shopify orders from webhook data
 */
export async function getShopifyOrdersFromDb(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [
      eq(shopifyOrders.financialStatus, "paid"),
    ];
    
    // Use createdAt for filtering since processedAt might be NULL
    if (startDate) {
      conditions.push(gte(shopifyOrders.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(shopifyOrders.createdAt, endDate));
    }
    
    const orders = await db
      .select()
      .from(shopifyOrders)
      .where(and(...conditions));
    
    return orders;
  } catch (error) {
    console.error("[Database] Failed to fetch Shopify orders:", error);
    return [];
  }
}

/**
 * Get Shopify order items for specific orders
 */
export async function getShopifyOrderItems(orderIds: number[]) {
  const db = await getDb();
  if (!db || orderIds.length === 0) return [];

  try {
    const { inArray } = await import("drizzle-orm");
    
    const items = await db
      .select()
      .from(shopifyOrderItems)
      .where(inArray(shopifyOrderItems.orderId, orderIds));
    
    return items;
  } catch (error) {
    console.error("[Database] Failed to fetch order items:", error);
    return [];
  }
}

/**
 * Get Shopify refunds for date range
 */
export async function getShopifyRefunds(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(shopifyRefunds.processedAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(shopifyRefunds.processedAt, endDate));
    }
    
    const refunds = await db
      .select()
      .from(shopifyRefunds)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return refunds;
  } catch (error) {
    console.error("[Database] Failed to fetch refunds:", error);
    return [];
  }
}
