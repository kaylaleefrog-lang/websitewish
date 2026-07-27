import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { serializeList } from "../_lib/serialize.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const lists = await sql`SELECT * FROM wishlists WHERE user_id = ${user.id} ORDER BY created_at ASC`;
    const items = await sql`
      SELECT i.* FROM items i
      JOIN wishlists w ON w.id = i.wishlist_id
      WHERE w.user_id = ${user.id}
      ORDER BY i.added_at DESC
    `;
    const result = lists.map(list =>
      serializeList(list, items.filter(i => i.wishlist_id === list.id))
    );
    res.status(200).json({ lists: result });
    return;
  }

  if (req.method === "POST") {
    const { name, icon } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "List name is required" });
      return;
    }
    const id = randomUUID();
    const rows = await sql`
      INSERT INTO wishlists (id, user_id, name, icon)
      VALUES (${id}, ${user.id}, ${name.trim()}, ${icon || "star"})
      RETURNING *
    `;
    res.status(200).json({ list: serializeList(rows[0], []) });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
