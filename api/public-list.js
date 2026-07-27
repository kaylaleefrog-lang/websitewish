import { sql } from "./_lib/db.js";
import { serializePublicList, serializePublicItem } from "./_lib/serialize.js";

// Unauthenticated by design: this powers the "Share" link, which lets anyone
// with the URL view a list (GET) and mark items as claimed (PATCH). List and
// item ids are random UUIDs, so the link itself is the access control —
// serializePublicList/Item already exclude user_id/email.
//
// GET and PATCH are combined in one file to stay under Vercel's Hobby-plan
// serverless function limit rather than splitting into more files.
export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;
    const rows = await sql`SELECT * FROM wishlists WHERE id = ${id}`;
    if (rows.length === 0) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    const items = await sql`SELECT * FROM items WHERE wishlist_id = ${id} ORDER BY added_at DESC`;
    res.status(200).json({ list: serializePublicList(rows[0], items) });
    return;
  }

  if (req.method === "PATCH") {
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
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
