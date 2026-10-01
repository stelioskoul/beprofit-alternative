import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { closeDb, getShopifyConnectionByStoreId, upsertShopifyConnection } from "../server/db.ts";

if (process.env.RUN_DB_SMOKE !== "1" || !process.env.DATABASE_URL) {
  throw new Error("Set RUN_DB_SMOKE=1 and DATABASE_URL to deliberately run this write/cleanup smoke test");
}

const origin = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
const emails = [`smoke-a-${suffix}@example.invalid`, `smoke-b-${suffix}@example.invalid`];
const users = [{ cookie: "" }, { cookie: "" }];

async function call(who, procedure, input, mutation = false) {
  const path = `${origin}/api/trpc/${procedure}`;
  const response = await fetch(mutation ? path : `${path}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}`, {
    method: mutation ? "POST" : "GET",
    headers: {
      ...(mutation ? { "Content-Type": "application/json" } : {}),
      ...(who?.cookie ? { Cookie: who.cookie } : {}),
    },
    ...(mutation ? { body: JSON.stringify({ json: input }) } : {}),
  });
  const cookie = response.headers.get("set-cookie");
  if (who && cookie) who.cookie = cookie.split(";")[0];
  const body = await response.json();
  return { status: response.status, data: body.result?.data?.json, error: body.error?.json || body.error };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  for (let i = 0; i < emails.length; i++) {
    const response = await call(users[i], "auth.signup", {
      email: emails[i], password: `test-only-${randomUUID()}!`, name: `Smoke ${i}`,
    }, true);
    assert(response.status === 200 && response.data?.success && users[i].cookie, `Signup ${i} failed: ${JSON.stringify(response.error)}`);
  }
  const me = await call(users[0], "auth.me");
  assert(me.status === 200 && me.data?.email === emails[0] && !("passwordHash" in me.data), "auth.me exposed credentials or failed");
  const store = await call(users[0], "stores.create", { name: "Smoke test store", platform: "shopify", currency: "USD", timezone: "Europe/Athens" }, true);
  assert(store.status === 200 && store.data?.success, `Store creation failed: ${JSON.stringify(store.error)}`);
  const list = await call(users[0], "stores.list");
  assert(list.status === 200 && list.data?.length === 1, "Owner cannot list their new store");
  const storeId = list.data[0].id;
  const otherList = await call(users[1], "stores.list");
  assert(otherList.status === 200 && otherList.data?.length === 0, "Another account can list the first account's store");
  const otherStore = await call(users[1], "stores.getById", { id: storeId });
  assert(otherStore.status === 404, "Another account can read the first account's store");

  const expense = await call(users[0], "expenses.create", { storeId, title: "Smoke expense", amount: "1.25", currency: "USD", type: "one_time", date: "2026-10-01" }, true);
  assert(expense.status === 200, `Expense creation failed: ${JSON.stringify(expense.error)}`);
  const expenses = await call(users[0], "expenses.list", { storeId });
  assert(expenses.data?.length === 1 && expenses.data[0].amount === "1.25", "Expense read/decimal serialization failed");
  const forbiddenDelete = await call(users[1], "expenses.delete", { storeId, id: expenses.data[0].id }, true);
  assert(forbiddenDelete.status === 404, "A second account could delete someone else's expense");

  const cogs = await call(users[0], "config.setCogs", { storeId, variantId: "smoke-variant", cogsValue: "9.50" }, true);
  assert(cogs.status === 200, `COGS upsert failed: ${JSON.stringify(cogs.error)}`);
  const cogsList = await call(users[0], "config.getCogs", { storeId });
  assert(cogsList.data?.length === 1 && cogsList.data[0].cogsValue === "9.50", "COGS read failed");

  await upsertShopifyConnection({
    storeId, shopDomain: "smoke.myshopify.com", accessToken: "fake-test-token-not-valid-at-shopify", apiVersion: "2026-07",
  });
  const stored = await sql`SELECT "accessToken" FROM public."shopify_connections" WHERE "storeId" = ${storeId} LIMIT 1`;
  assert(stored[0]?.accessToken.startsWith("v1:") && !stored[0].accessToken.includes("fake-test-token"), "Provider token stored in plaintext");
  const decoded = await getShopifyConnectionByStoreId(storeId);
  assert(decoded?.accessToken === "fake-test-token-not-valid-at-shopify", "Stored provider token could not be decrypted");

  const account = await sql`SELECT "id" FROM public."users" WHERE "email" = ${emails[0]} LIMIT 1`;
  assert(account[0], "Signup did not persist in Supabase Postgres");
  const result = await sql`SELECT "role"::text AS role FROM public."users" WHERE "id" = ${account[0].id} LIMIT 1`;
  assert(result[0]?.role === "user", "New signup obtained elevated privileges");
  console.log("PASS: signup, auth redaction, Postgres persistence, store isolation, expenses, COGS, provider token encryption");
} finally {
  try {
    await sql`DELETE FROM public."users" WHERE "email" IN (${emails[0]}, ${emails[1]})`;
    const remains = await sql`SELECT count(*)::integer AS count FROM public."users" WHERE "email" IN (${emails[0]}, ${emails[1]}) LIMIT 1`;
    console.log(`Cleanup: ${remains[0].count === 0 ? "both temporary users removed" : "INCOMPLETE — inspect smoke users"}`);
  } finally {
    await Promise.allSettled([sql.end({ timeout: 5 }), closeDb()]);
  }
}
