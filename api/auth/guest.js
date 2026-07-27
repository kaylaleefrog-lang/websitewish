import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { createSession, setSessionCookie } from "../_lib/auth.js";

// Creates a real account with no email/password yet, so a first-time
// visitor can start building a wishlist immediately. api/auth/claim.js
// later fills in the email/password when they decide to save it, turning
// this same row into a normal account without losing anything they made.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = randomUUID();
  await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, NULL, NULL)`;

  const session = await createSession(userId);
  setSessionCookie(res, session.id, session.expiresAt);

  res.status(200).json({ user: { id: userId, email: null } });
}
