import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  stores,
  InsertStore,
  shopifyConnections,
  InsertShopifyConnection,
  facebookConnections,
  InsertFacebookConnection,
  cogsConfig,
  InsertCogsConfig,
  shippingConfig,
  InsertShippingConfig,
  shippingProfiles,
  InsertShippingProfile,
  productShippingProfiles,
  InsertProductShippingProfile,
  operationalExpenses,
  InsertOperationalExpense,
  processingFeesConfig,
  InsertProcessingFeesConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

// ============================================================================
// STORE OPERATIONS
// ============================================================================

export async function createStore(store: InsertStore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(stores).values(store);
  return result;
}

export async function getStoresByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(stores).where(eq(stores.userId, userId));
}

export async function getStoreById(storeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateStore(storeId: number, updates: Partial<InsertStore>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(stores).set(updates).where(eq(stores.id, storeId));
}

export async function deleteStore(storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(stores).where(eq(stores.id, storeId));
}

// ============================================================================
// SHOPIFY CONNECTION OPERATIONS
// ============================================================================

export async function upsertShopifyConnection(connection: InsertShopifyConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(shopifyConnections).values(connection).onDuplicateKeyUpdate({
    set: {
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
      scopes: connection.scopes,
      apiVersion: connection.apiVersion,
      connectedAt: new Date(),
    },
  });
}

export async function getShopifyConnectionByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(shopifyConnections).where(eq(shopifyConnections.storeId, storeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteShopifyConnection(storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shopifyConnections).where(eq(shopifyConnections.storeId, storeId));
}

// ============================================================================
// FACEBOOK CONNECTION OPERATIONS
// ============================================================================

export async function upsertFacebookConnection(connection: InsertFacebookConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(facebookConnections).values(connection).onDuplicateKeyUpdate({
    set: {
      accessToken: connection.accessToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      apiVersion: connection.apiVersion,
      timezoneOffset: connection.timezoneOffset,
      connectedAt: new Date(),
    },
  });
}

export async function getFacebookConnectionsByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(facebookConnections).where(eq(facebookConnections.storeId, storeId));
}

export async function deleteFacebookConnection(connectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(facebookConnections).where(eq(facebookConnections.id, connectionId));
}

// ============================================================================
// COGS CONFIG OPERATIONS
// ============================================================================

export async function upsertCogsConfig(config: InsertCogsConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(cogsConfig).values(config).onDuplicateKeyUpdate({
    set: {
      cogsValue: config.cogsValue,
      productTitle: config.productTitle,
      currency: config.currency,
    },
  });
}

export async function getCogsConfigByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cogsConfig).where(eq(cogsConfig.storeId, storeId));
}

export async function deleteCogsConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(cogsConfig).where(eq(cogsConfig.id, configId));
}

// ============================================================================
// SHIPPING CONFIG OPERATIONS
// ============================================================================

export async function upsertShippingConfig(config: InsertShippingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(shippingConfig).values(config).onDuplicateKeyUpdate({
    set: {
      configJson: config.configJson,
      productTitle: config.productTitle,
    },
  });
}

export async function getShippingConfigByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  // First get direct shipping configs (old method)
  const directConfigs = await db.select().from(shippingConfig).where(eq(shippingConfig.storeId, storeId));
  
  // Then get shipping configs from assigned profiles (new method)
  // JOIN product_shipping_profiles with shipping_profiles to get the config for each variant
  const profileConfigs = await db
    .select({
      id: productShippingProfiles.id,
      storeId: productShippingProfiles.storeId,
      variantId: productShippingProfiles.variantId,
      productTitle: productShippingProfiles.productTitle,
      configJson: shippingProfiles.configJson,
      createdAt: productShippingProfiles.createdAt,
      updatedAt: productShippingProfiles.updatedAt,
    })
    .from(productShippingProfiles)
    .innerJoin(shippingProfiles, eq(productShippingProfiles.profileId, shippingProfiles.id))
    .where(eq(productShippingProfiles.storeId, storeId));
  
  // Combine both sources (profile configs take precedence over direct configs)
  const variantMap = new Map<string, any>();
  
  // Add direct configs first
  for (const config of directConfigs) {
    variantMap.set(config.variantId, config);
  }
  
  // Override with profile configs (newer method)
  for (const config of profileConfigs) {
    variantMap.set(config.variantId, config);
  }
  
  return Array.from(variantMap.values());
}

export async function deleteShippingConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shippingConfig).where(eq(shippingConfig.id, configId));
}

// ============================================================================
// OPERATIONAL EXPENSES OPERATIONS
// ============================================================================

export async function createOperationalExpense(expense: InsertOperationalExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(operationalExpenses).values(expense);
  return result;
}

export async function getOperationalExpensesByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(operationalExpenses).where(eq(operationalExpenses.storeId, storeId));
}

export async function deleteOperationalExpense(expenseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(operationalExpenses).where(eq(operationalExpenses.id, expenseId));
}

// ============================================================================
// PROCESSING FEES CONFIG OPERATIONS
// ============================================================================

export async function upsertProcessingFeesConfig(config: InsertProcessingFeesConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(processingFeesConfig).values(config).onDuplicateKeyUpdate({
    set: {
      percentFee: config.percentFee,
      fixedFee: config.fixedFee,
      currency: config.currency,
    },
  });
}

export async function getProcessingFeesConfigByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(processingFeesConfig).where(eq(processingFeesConfig.storeId, storeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// SHIPPING PROFILES OPERATIONS
// ============================================================================

export async function createShippingProfile(profile: InsertShippingProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shippingProfiles).values(profile);
  return result;
}

export async function getShippingProfilesByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(shippingProfiles).where(eq(shippingProfiles.storeId, storeId));
}

export async function getShippingProfileById(profileId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(shippingProfiles).where(eq(shippingProfiles.id, profileId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateShippingProfile(profileId: number, updates: Partial<InsertShippingProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(shippingProfiles).set(updates).where(eq(shippingProfiles.id, profileId));
}

export async function deleteShippingProfile(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all product assignments first
  await db.delete(productShippingProfiles).where(eq(productShippingProfiles.profileId, profileId));
  // Then delete the profile
  await db.delete(shippingProfiles).where(eq(shippingProfiles.id, profileId));
}

// ============================================================================
// PRODUCT SHIPPING PROFILES OPERATIONS
// ============================================================================

export async function assignShippingProfile(assignment: InsertProductShippingProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productShippingProfiles).values(assignment).onDuplicateKeyUpdate({
    set: {
      profileId: assignment.profileId,
      productTitle: assignment.productTitle,
    },
  });
}

export async function getProductShippingProfilesByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(productShippingProfiles).where(eq(productShippingProfiles.storeId, storeId));
}

export async function getProductShippingProfileByVariant(storeId: number, variantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(productShippingProfiles)
    .where(
      and(
        eq(productShippingProfiles.storeId, storeId),
        eq(productShippingProfiles.variantId, variantId)
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function removeProductShippingProfile(storeId: number, variantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(productShippingProfiles).where(
    and(
      eq(productShippingProfiles.storeId, storeId),
      eq(productShippingProfiles.variantId, variantId)
    )
  );
}
