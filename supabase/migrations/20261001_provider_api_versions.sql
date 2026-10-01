-- The 2025 Shopify and v21 Meta Marketing APIs are outdated in October 2026.
-- Preserve the applied initial migration and change only future connection defaults.
ALTER TABLE public."shopify_connections" ALTER COLUMN "apiVersion" SET DEFAULT '2026-07';
ALTER TABLE public."facebook_connections" ALTER COLUMN "apiVersion" SET DEFAULT 'v25.0';
