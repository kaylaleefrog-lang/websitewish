import { sql } from "./_lib/db.js";
import { serializePublicList } from "./_lib/serialize.js";

// Unauthenticated by design: this powers the "Share" link, which lets anyone
// with the URL view a list. List ids are random UUIDs, so the link itself is
// the access control — serializeList already excludes user_id/email.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;
  const rows = await sql`SELECT * FROM wishlists WHERE id = ${id}`;
  if (rows.length === 0) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const items = await sql`SELECT * FROM items WHERE wishlist_id = ${id} ORDER BY added_at DESC`;
  res.status(200).json({ list: serializePublicList(rows[0], items) });
}
