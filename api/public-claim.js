import { sql } from "./_lib/db.js";
import { serializePublicItem } from "./_lib/serialize.js";

// Unauthenticated by design, same as public-list.js: anyone with a share
// link can mark an item as "I'm getting this" so other gift-givers looking
// at the same link don't duplicate it. Item ids are random UUIDs, so the
// link is the access control.
export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { itemId, claimed } = req.body || {};
  if (typeof itemId !== "string" || typeof claimed !== "boolean") {
    res.status(400).json({ error: "itemId and claimed are required" });
    return;
  }

  const rows = await sql`UPDATE items SET claimed = ${claimed} WHERE id = ${itemId} RETURNING *`;
  if (rows.length === 0) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.status(200).json({ item: serializePublicItem(rows[0]) });
}
