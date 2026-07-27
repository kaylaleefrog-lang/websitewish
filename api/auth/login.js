import { sql } from "../_lib/db.js";
import { verifyPassword, isValidEmail, createSession, setSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, password } = req.body || {};
  if (!isValidEmail(email) || typeof password !== "string") {
    res.status(400).json({ error: "Incorrect email or password" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`SELECT id, email, password_hash FROM users WHERE email = ${normalizedEmail}`;
  const user = rows[0];

  // Same error for "no such user" and "wrong password" so a failed login
  // can't be used to discover which emails have accounts.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.id, session.expiresAt);

  res.status(200).json({ user: { id: user.id, email: user.email } });
}
