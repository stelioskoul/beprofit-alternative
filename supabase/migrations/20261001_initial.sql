-- BeProfit PostgreSQL initial schema for a fresh Supabase project.
-- This migration is intentionally a fresh-data migration; it does not import MySQL data.

BEGIN;

CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.operational_expense_type AS ENUM ('one_time', 'monthly', 'yearly');

CREATE TABLE public."users" (
  "id" serial PRIMARY KEY,
  "openId" varchar(64),
  "email" varchar(320) NOT NULL,
  "passwordHash" text,
  "name" text,
  "loginMethod" varchar(64) DEFAULT 'email',
  "role" public.user_role NOT NULL DEFAULT 'user',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "users_openId_unique" UNIQUE ("openId"),
  CONSTRAINT "users_email_unique" UNIQUE ("email")
);

CREATE TABLE public."stores" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "platform" varchar(50) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD',
  "timezone" varchar(50) DEFAULT 'America/New_York',
  "timezoneOffset" integer DEFAULT -300,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stores_userId_users_id_fk"
    FOREIGN KEY ("userId") REFERENCES public."users"("id") ON DELETE CASCADE
);

CREATE TABLE public."shopify_connections" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "shopDomain" varchar(255) NOT NULL,
  "accessToken" text NOT NULL,
  "scopes" text,
  "apiVersion" varchar(20) DEFAULT '2025-10',
  "connectedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastSyncAt" timestamp with time zone,
  CONSTRAINT "shopify_connections_storeId_unique" UNIQUE ("storeId"),
  CONSTRAINT "shopify_connections_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."facebook_connections" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "adAccountId" varchar(255) NOT NULL,
  "accessToken" text NOT NULL,
  "tokenExpiresAt" timestamp with time zone,
  "apiVersion" varchar(20) DEFAULT 'v21.0',
  "timezoneOffset" integer DEFAULT -300,
  "connectedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastSyncAt" timestamp with time zone,
  CONSTRAINT "facebook_connections_storeId_adAccountId_unique" UNIQUE ("storeId", "adAccountId"),
  CONSTRAINT "facebook_connections_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."cogs_config" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "variantId" varchar(255) NOT NULL,
  "productTitle" text,
  "cogsValue" numeric(10, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cogs_config_storeId_variantId_unique" UNIQUE ("storeId", "variantId"),
  CONSTRAINT "cogs_config_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."shipping_config" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "variantId" varchar(255) NOT NULL,
  "productTitle" text,
  "configJson" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shipping_config_storeId_variantId_unique" UNIQUE ("storeId", "variantId"),
  CONSTRAINT "shipping_config_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."operational_expenses" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "type" public.operational_expense_type NOT NULL,
  "title" varchar(255) NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD',
  "date" date,
  "startDate" date,
  "endDate" date,
  "isActive" integer DEFAULT 1,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "operational_expenses_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."processing_fees_config" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "percentFee" numeric(5, 4) DEFAULT 0.0280,
  "fixedFee" numeric(10, 2) DEFAULT 0.29,
  "currency" varchar(3) DEFAULT 'USD',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "processing_fees_config_storeId_unique" UNIQUE ("storeId"),
  CONSTRAINT "processing_fees_config_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."exchange_rates" (
  "id" serial PRIMARY KEY,
  "fromCurrency" varchar(3) NOT NULL,
  "toCurrency" varchar(3) NOT NULL,
  "rate" numeric(10, 6) NOT NULL,
  "effectiveDate" date NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "exchange_rates_fromCurrency_toCurrency_effectiveDate_unique"
    UNIQUE ("fromCurrency", "toCurrency", "effectiveDate")
);

CREATE TABLE public."shipping_profiles" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "configJson" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  -- This redundant-with-PK pair is required as the referenced composite key below.
  CONSTRAINT "shipping_profiles_storeId_id_unique" UNIQUE ("storeId", "id"),
  CONSTRAINT "shipping_profiles_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE
);

CREATE TABLE public."product_shipping_profiles" (
  "id" serial PRIMARY KEY,
  "storeId" integer NOT NULL,
  "variantId" varchar(255) NOT NULL,
  "profileId" integer NOT NULL,
  "productTitle" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_shipping_profiles_storeId_variantId_unique" UNIQUE ("storeId", "variantId"),
  CONSTRAINT "product_shipping_profiles_storeId_stores_id_fk"
    FOREIGN KEY ("storeId") REFERENCES public."stores"("id") ON DELETE CASCADE,
  CONSTRAINT "product_shipping_profiles_storeId_profileId_shipping_profiles_fk"
    FOREIGN KEY ("storeId", "profileId")
    REFERENCES public."shipping_profiles"("storeId", "id") ON DELETE CASCADE
);

-- PostgreSQL does not create child-side FK indexes automatically. The unique constraints
-- above cover their leading storeId values; these cover the remaining standalone lookups
-- and composite profile FK path.
CREATE INDEX "stores_userId_idx" ON public."stores" ("userId");
CREATE INDEX "operational_expenses_storeId_idx" ON public."operational_expenses" ("storeId");
CREATE INDEX "shipping_profiles_storeId_idx" ON public."shipping_profiles" ("storeId");
CREATE INDEX "product_shipping_profiles_storeId_profileId_idx"
  ON public."product_shipping_profiles" ("storeId", "profileId");

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER "users_set_updatedAt"
  BEFORE UPDATE ON public."users"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "stores_set_updatedAt"
  BEFORE UPDATE ON public."stores"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "cogs_config_set_updatedAt"
  BEFORE UPDATE ON public."cogs_config"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "shipping_config_set_updatedAt"
  BEFORE UPDATE ON public."shipping_config"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "operational_expenses_set_updatedAt"
  BEFORE UPDATE ON public."operational_expenses"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "processing_fees_config_set_updatedAt"
  BEFORE UPDATE ON public."processing_fees_config"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "shipping_profiles_set_updatedAt"
  BEFORE UPDATE ON public."shipping_profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "product_shipping_profiles_set_updatedAt"
  BEFORE UPDATE ON public."product_shipping_profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The application role cannot log in. A separately managed server-only login role must
-- assume it (SET LOCAL ROLE beprofit_app) after an administrator grants membership.
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'beprofit_app') THEN
    CREATE ROLE beprofit_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$role$;

GRANT USAGE ON SCHEMA public TO beprofit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."users",
  public."stores",
  public."shopify_connections",
  public."facebook_connections",
  public."cogs_config",
  public."shipping_config",
  public."operational_expenses",
  public."processing_fees_config",
  public."exchange_rates",
  public."shipping_profiles",
  public."product_shipping_profiles"
TO beprofit_app;
GRANT USAGE, SELECT ON SEQUENCE
  public."users_id_seq",
  public."stores_id_seq",
  public."shopify_connections_id_seq",
  public."facebook_connections_id_seq",
  public."cogs_config_id_seq",
  public."shipping_config_id_seq",
  public."operational_expenses_id_seq",
  public."processing_fees_config_id_seq",
  public."exchange_rates_id_seq",
  public."shipping_profiles_id_seq",
  public."product_shipping_profiles_id_seq"
TO beprofit_app;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO beprofit_app;

-- Block browser-facing Supabase roles even if a project-wide default privilege is present.
REVOKE ALL PRIVILEGES ON TABLE
  public."users",
  public."stores",
  public."shopify_connections",
  public."facebook_connections",
  public."cogs_config",
  public."shipping_config",
  public."operational_expenses",
  public."processing_fees_config",
  public."exchange_rates",
  public."shipping_profiles",
  public."product_shipping_profiles"
FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE
  public."users_id_seq",
  public."stores_id_seq",
  public."shopify_connections_id_seq",
  public."facebook_connections_id_seq",
  public."cogs_config_id_seq",
  public."shipping_config_id_seq",
  public."operational_expenses_id_seq",
  public."processing_fees_config_id_seq",
  public."exchange_rates_id_seq",
  public."shipping_profiles_id_seq",
  public."product_shipping_profiles_id_seq"
FROM PUBLIC, anon, authenticated;

ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."shopify_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."facebook_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cogs_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."shipping_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."operational_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."processing_fees_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exchange_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."shipping_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_shipping_profiles" ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies exist for anon or authenticated. All data access is through
-- the existing Express server, using the server-only beprofit_app role.
CREATE POLICY "beprofit_app_users_access" ON public."users"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_stores_access" ON public."stores"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_shopify_connections_access" ON public."shopify_connections"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_facebook_connections_access" ON public."facebook_connections"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_cogs_config_access" ON public."cogs_config"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_shipping_config_access" ON public."shipping_config"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_operational_expenses_access" ON public."operational_expenses"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_processing_fees_config_access" ON public."processing_fees_config"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_exchange_rates_access" ON public."exchange_rates"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_shipping_profiles_access" ON public."shipping_profiles"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);
CREATE POLICY "beprofit_app_product_shipping_profiles_access" ON public."product_shipping_profiles"
  FOR ALL TO beprofit_app USING (true) WITH CHECK (true);

COMMIT;
