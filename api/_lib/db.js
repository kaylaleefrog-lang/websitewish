import { neon } from "@neondatabase/serverless";

// Vercel's Neon integration can name the connection string a few different
// things depending on how the database was connected to the project, so try
// the common ones rather than hardcoding a single name.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "No database connection string found in the environment (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING). " +
    "Check your Vercel project's Storage tab to confirm the database is connected and see which variable name it uses."
  );
}

export const sql = neon(connectionString);
