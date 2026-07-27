import { sql } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { serializeItem } from "../_lib/serialize.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const rows = await sql`
    SELECT i.* FROM items i
    JOIN wishlists w ON w.id = i.wishlist_id
    WHERE i.id = ${id} AND w.user_id = ${user.id}
  `;
  const current = rows[0];
  if (!current) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    // Whitelist of fields the app actually lets you change after an item
    // is created (choosing a different photo, toggling priority/alerts).
    // Anything not provided keeps its current value.
    const selectedImage = body.selectedImage !== undefined ? body.selectedImage : current.selected_image;
    const priority = body.priority !== undefined ? !!body.priority : current.priority;
    const notifyOnSale = body.notifyOnSale !== undefined ? !!body.notifyOnSale : current.notify_on_sale;

    const updated = await sql`
      UPDATE items
      SET selected_image = ${selectedImage}, priority = ${priority}, notify_on_sale = ${notifyOnSale}
      WHERE id = ${id}
      RETURNING *
    `;
    res.status(200).json({ item: serializeItem(updated[0]) });
    return;
  }

  if (req.method === "DELETE") {
    await sql`DELETE FROM items WHERE id = ${id}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
