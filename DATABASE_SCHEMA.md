# Database Schema

## Scope and source of truth

The PostgreSQL schema is defined in:

- **Deployment migration:** `supabase/migrations/20261001_initial.sql`
- **Drizzle TypeScript schema:** `drizzle/schema.ts`

The SQL migration is the **deployment source of truth**. It is a one-shot migration for a **new, empty Supabase project** and must be applied through the Supabase migration workflow by a project administrator. It must **not** be run against an existing database that already contains these tables or types.

This is an intentionally **fresh-data** migration. It contains no MySQL data dump, schema conversion, or automatic data transfer. Any production MySQL data requires a separately planned export, transform, import, reconciliation, and cutover. Do not point a running application at the new database until connection setup and data migration (if needed) are complete.

`drizzle.config.ts` uses the PostgreSQL dialect and writes any future Drizzle Kit generated metadata to `drizzle/pg`, not the legacy `drizzle/meta` MySQL journal. Do not use Drizzle Kit generation as a substitute for applying the checked-in Supabase migration.

## Authentication model

> **Supabase Auth is not used by this application.**

`public.users` remains the application-owned identity table:

- `id` remains an integer `serial` primary key.
- `email` remains required and unique.
- `passwordHash` remains the custom email/password hash used by the Express server.
- `openId`, `loginMethod`, `role`, and `lastSignedIn` remain application fields.

There is deliberately no `auth.users` foreign key, Auth trigger, Supabase Auth policy, or data migration. The existing Express login/session flow continues to own authentication and authorization.

## Tables and relationships

All physical table and column names retain their existing casing. Camel-case PostgreSQL identifiers are quoted in SQL and are represented with the same names in Drizzle.

| Table                       | Primary key | Main relationships and constraints                                                                                                                     |
| --------------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`                     |        `id` | Unique `email`; optional unique `openId`.                                                                                                              |
| `stores`                    |        `id` | `userId` → `users.id`, cascade delete.                                                                                                                 |
| `shopify_connections`       |        `id` | Unique `storeId`; `storeId` → `stores.id`, cascade delete.                                                                                             |
| `facebook_connections`      |        `id` | Unique (`storeId`, `adAccountId`); `storeId` → `stores.id`, cascade delete.                                                                            |
| `cogs_config`               |        `id` | Unique (`storeId`, `variantId`); `storeId` → `stores.id`, cascade delete.                                                                              |
| `shipping_config`           |        `id` | Unique (`storeId`, `variantId`); `storeId` → `stores.id`, cascade delete.                                                                              |
| `operational_expenses`      |        `id` | `storeId` → `stores.id`, cascade delete.                                                                                                               |
| `processing_fees_config`    |        `id` | Unique `storeId`; `storeId` → `stores.id`, cascade delete.                                                                                             |
| `exchange_rates`            |        `id` | Unique (`fromCurrency`, `toCurrency`, `effectiveDate`).                                                                                                |
| `shipping_profiles`         |        `id` | `storeId` → `stores.id`, cascade delete; unique (`storeId`, `id`) supports the tenant-safe composite child FK.                                         |
| `product_shipping_profiles` |        `id` | Unique (`storeId`, `variantId`); `storeId` → `stores.id`, cascade delete; (`storeId`, `profileId`) → `shipping_profiles(storeId, id)`, cascade delete. |

The composite `product_shipping_profiles` foreign key is intentional: a variant cannot refer to a shipping profile belonging to a different store.

## PostgreSQL type and response compatibility

| Existing data meaning                    | PostgreSQL storage         | Drizzle result behavior                                                                                                                                                                                                              |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Integer IDs and counters                 | `serial` / `integer`       | JavaScript `number`.                                                                                                                                                                                                                 |
| Money, fees, and exchange rates          | Fixed-precision `numeric`  | **String**, avoiding floating-point rounding changes.                                                                                                                                                                                |
| Expense and exchange-rate calendar dates | `date`                     | Configured with `mode: "date"`, therefore returned by Drizzle as JavaScript `Date`. Preserve date-only API contracts at the Express response boundary (for example, format as `YYYY-MM-DD`) if existing callers expect date strings. |
| Audit/connection timestamps              | `timestamp with time zone` | JavaScript `Date`; values are timezone-aware in PostgreSQL.                                                                                                                                                                          |
| JSON-shaped shipping configuration       | `text`                     | Unchanged: `configJson` remains a text payload.                                                                                                                                                                                      |

The currency and fee defaults are retained. Provider versions were updated in the separate `20261001_provider_api_versions.sql` migration: Shopify `2026-07` and Meta Marketing `v25.0`; the initial migration records the original versions. `user_role` and `operational_expense_type` are PostgreSQL enums that preserve the original allowed values.

## Automatic `updatedAt`

PostgreSQL has no MySQL-style `ON UPDATE CURRENT_TIMESTAMP` column clause. The migration creates `public.set_updated_at()` and attaches `BEFORE UPDATE` triggers to every table that originally has an `updatedAt` column:

- `users`
- `stores`
- `cogs_config`
- `shipping_config`
- `operational_expenses`
- `processing_fees_config`
- `shipping_profiles`
- `product_shipping_profiles`

`shopify_connections`, `facebook_connections`, and `exchange_rates` intentionally have no `updatedAt` column because none existed in the original schema; their existing `lastSyncAt` or `createdAt` fields remain unchanged.

## Security and Row Level Security

Every application table in `public` has RLS enabled. There are **no policies for `anon` or `authenticated`**, and their table and sequence privileges are revoked. Browser clients must not query these tables through Supabase's Data API.

The migration creates this dedicated role if it does not already exist:

```sql
beprofit_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
```

It receives only:

- `USAGE` on schema `public`;
- `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the eleven application tables;
- `USAGE` and `SELECT` on the associated `serial` sequences;
- execution of the `updatedAt` trigger function; and
- one `FOR ALL` RLS policy per application table, **to `beprofit_app` only**.

The initial migration creates `beprofit_app` with `NOLOGIN` so no plaintext password enters source control. A separate **private** Supabase migration enabled `LOGIN` with a locally generated SCRAM verifier. The Express server connects directly as this role through the verified IPv4 session pooler. Its raw password is not part of either committed migration. Do not grant this role to `anon`, `authenticated`, browser clients, or public API keys. Keep its connection string only in server-side secret configuration; never expose it in client code or committed files.

## Fresh-project setup checklist

1. Create or select an empty Supabase project.
2. Apply `supabase/migrations/20261001_initial.sql` once through the administrator-controlled Supabase migration process. Do not apply it through a public browser endpoint.
3. Apply `supabase/migrations/20261001_provider_api_versions.sql` to update provider connection defaults.
4. Create a strong private credential and enable the already-created role from an **administrator-only** SQL session: `ALTER ROLE beprofit_app WITH LOGIN PASSWORD '<new-random-password>';`. Supply the actual password only in a protected SQL editor or private migration input, **never in a committed migration, shell history or chat**. A precomputed SCRAM verifier can be used as the `PASSWORD` value instead, as was done for this recovered project. Verify `rolcanlogin` afterward. A fresh baseline intentionally leaves this role `NOLOGIN` until this explicit secret-dependent step occurs.
5. Configure the Express server with a private **session-pooler** PostgreSQL `DATABASE_URL` and separate `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` values in a protected secret manager; startup now refuses to listen without valid values.
6. Keep application login on the existing Express email/password flow. Do not enable or substitute Supabase Auth as part of this migration.
7. If moving existing data, complete a separate validated ETL/cutover before serving traffic. This migration provides schema only.

## Operational caveats

- The migration is **not idempotent**: a migration runner should record it as applied, and it is only safe on a fresh project.
- Application code that relied on MySQL driver date strings should explicitly preserve the desired date-only JSON format, because the required Drizzle `mode: "date"` maps to JavaScript `Date`.
- The RLS policy grants broad table access to the trusted server role; user/store-level authorization continues to be enforced by the Express application, not by a Supabase Auth identity policy.
- New Shopify/Facebook OAuth tokens are encrypted with AES-256-GCM before storage; the server requires a separate `TOKEN_ENCRYPTION_KEY` and fails closed if it is missing. Back up this key separately from the database. Treat database backups, logs, and administrative access as sensitive regardless.
