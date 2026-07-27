import { randomUUID } from "node:crypto";
import { sql } from "../_lib/db.js";
import { hashPassword, isValidEmail, createSession, setSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
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
  const userId = randomUUID();
  await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${normalizedEmail}, ${passwordHash})`;

  const session = await createSession(userId);
  setSessionCookie(res, session.id, session.expiresAt);

  res.status(200).json({ user: { id: userId, email: normalizedEmail } });
}
