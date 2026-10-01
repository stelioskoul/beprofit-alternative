import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  // Keep generated PostgreSQL metadata separate from the legacy MySQL journal.
  // The deployable source-of-truth migration is supabase/migrations/20261001_initial.sql.
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
