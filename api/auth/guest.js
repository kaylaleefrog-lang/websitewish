import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { requireAuth, createSession, setSessionCookie, hashPassword, isValidEmail } from "../_lib/auth.js";

// POST creates a real account with no email/password yet, so a first-time
// visitor can start building a wishlist immediately. PATCH ("claim") later
// fills in the email/password when they decide to save it, turning this
// same row into a normal account without losing anything they made.
//
// Both are combined in one file to stay under Vercel's Hobby-plan
// serverless function limit rather than splitting into more files.
export default async function handler(req, res) {
  if (req.method === "POST") {
    const userId = randomUUID();
    await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, NULL, NULL)`;

    const session = await createSession(userId);
    setSessionCookie(res, session.id, session.expiresAt);

    res.status(200).json({ user: { id: userId, email: null } });
    return;
  }

  if (req.method === "PATCH") {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.email) {
      res.status(400).json({ error: "This account already has an email" });
      return;
    }

    const { email, password } = req.body || {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    await sql`UPDATE users SET email = ${normalizedEmail}, password_hash = ${passwordHash} WHERE id = ${user.id}`;

    res.status(200).json({ user: { id: user.id, email: normalizedEmail } });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
