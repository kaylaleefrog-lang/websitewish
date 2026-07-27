import { neon } from "@neondatabase/serverless";
import { getConnectionString } from "./connectionString.js";

const connectionString = getConnectionString();

if (!connectionString) {
  throw new Error(
    "No database connection string found in the environment (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING, including prefixed variants of those names). " +
    "Check your Vercel project's Storage tab to confirm the database is connected and see which variable name it uses."
  );
}

export const sql = neon(connectionString);
