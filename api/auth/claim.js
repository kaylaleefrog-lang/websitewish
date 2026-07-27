import { sql } from "../_lib/db.js";
import { requireAuth, hashPassword, isValidEmail } from "../_lib/auth.js";

// Turns the current guest account (see api/auth/guest.js) into a normal,
// password-protected account by filling in email/password_hash on the same
// row — the user id doesn't change, so their existing lists/items carry
// over automatically.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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
}
