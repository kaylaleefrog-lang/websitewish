import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { serializeList } from "../_lib/serialize.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const lists = await sql`SELECT * FROM wishlists WHERE user_id = ${user.id} ORDER BY position ASC, created_at ASC`;
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
    const [{ next_position }] = await sql`
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM wishlists WHERE user_id = ${user.id}
    `;
    const rows = await sql`
      INSERT INTO wishlists (id, user_id, name, icon, position)
      VALUES (${id}, ${user.id}, ${name.trim()}, ${icon || "star"}, ${next_position})
      RETURNING *
    `;
    res.status(200).json({ list: serializeList(rows[0], []) });
    return;
  }

  // Drag-to-reorder: body is the full list of wishlist ids in their new
  // order. Position is just each id's index in that array.
  if (req.method === "PATCH") {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.some(id => typeof id !== "string")) {
      res.status(400).json({ error: "order must be an array of list ids" });
      return;
    }
    await Promise.all(
      order.map((id, position) =>
        sql`UPDATE wishlists SET position = ${position} WHERE id = ${id} AND user_id = ${user.id}`
      )
    );
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
