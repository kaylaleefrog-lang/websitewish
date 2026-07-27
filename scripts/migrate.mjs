#!/usr/bin/env node
// One-time (and re-runnable) setup: creates the tables Wishly needs.
//
// Run it with your database's connection string:
//
//   DATABASE_URL="postgres://..." node scripts/migrate.mjs
//
// Get that string from Vercel: Project -> Storage -> your database ->
// .env.local tab (copy the DATABASE_URL value). This connects straight to
// Postgres over the wire protocol, so — unlike the Vercel dashboard's Query
// tab, which runs everything in a read-only transaction for safety — it can
// actually create tables.
import { readFileSync } from "node:fs";
import { Client } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.error("Set DATABASE_URL (or POSTGRES_URL) before running this script.");
  process.exit(1);
}

const schemaPath = new URL("../db/schema.sql", import.meta.url);
const schema = readFileSync(schemaPath, "utf8");

const client = new Client(connectionString);
await client.connect();
try {
  await client.query(schema);
  console.log("Schema applied — users, sessions, wishlists, items tables are ready.");
} finally {
  await client.end();
}
