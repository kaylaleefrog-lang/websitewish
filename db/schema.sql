-- Wishly database schema.
-- Run this once against your database (Vercel Storage tab -> your database
-- -> Query / SQL Editor), before using signup/login on the live site.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

-- email/password_hash are nullable: a guest browsing before they sign up
-- gets a real row here with both left NULL (see api/auth/guest.js), which
-- becomes a normal account once they sign up (see api/auth/claim.js).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  selected_image TEXT NOT NULL DEFAULT '',
  available_images JSONB NOT NULL DEFAULT '[]',
  price NUMERIC,
  original_price NUMERIC,
  on_sale BOOLEAN NOT NULL DEFAULT false,
  sale_percent INTEGER,
  store TEXT NOT NULL DEFAULT '',
  notify_on_sale BOOLEAN NOT NULL DEFAULT true,
  priority BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Re-running this file against a database created before the "claimed"
-- column existed adds it without touching existing rows.
ALTER TABLE items ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT false;

-- Same idea for a database created before guest accounts existed.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_items_wishlist_id ON items(wishlist_id);
