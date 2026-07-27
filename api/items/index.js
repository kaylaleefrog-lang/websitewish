import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { serializeItem } from "../_lib/serialize.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    listId, url, title, description, selectedImage, availableImages,
    price, originalPrice, onSale, salePercent, store, notifyOnSale, priority,
  } = req.body || {};

  if (typeof listId !== "string" || typeof url !== "string" || typeof title !== "string") {
    res.status(400).json({ error: "listId, url, and title are required" });
    return;
  }

  const owned = await sql`SELECT id FROM wishlists WHERE id = ${listId} AND user_id = ${user.id}`;
  if (owned.length === 0) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const id = randomUUID();
  const rows = await sql`
    INSERT INTO items (
      id, wishlist_id, url, title, description, selected_image, available_images,
      price, original_price, on_sale, sale_percent, store, notify_on_sale, priority
    ) VALUES (
      ${id}, ${listId}, ${url}, ${title}, ${description || ""}, ${selectedImage || ""},
      ${JSON.stringify(availableImages || [])}, ${price ?? null}, ${originalPrice ?? null},
      ${!!onSale}, ${salePercent ?? null}, ${store || ""}, ${notifyOnSale !== false}, ${!!priority}
    )
    RETURNING *
  `;

  res.status(200).json({ item: serializeItem(rows[0]) });
}
