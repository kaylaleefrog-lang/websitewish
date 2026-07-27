import { sql } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { serializeList } from "../_lib/serialize.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const owned = await sql`SELECT id FROM wishlists WHERE id = ${id} AND user_id = ${user.id}`;
  if (owned.length === 0) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  if (req.method === "PATCH") {
    const { name } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "List name is required" });
      return;
    }
    const rows = await sql`UPDATE wishlists SET name = ${name.trim()} WHERE id = ${id} RETURNING *`;
    const items = await sql`SELECT * FROM items WHERE wishlist_id = ${id} ORDER BY added_at DESC`;
    res.status(200).json({ list: serializeList(rows[0], items) });
    return;
  }

  if (req.method === "DELETE") {
    await sql`DELETE FROM wishlists WHERE id = ${id}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
