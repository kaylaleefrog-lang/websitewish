import bcrypt from "bcryptjs";
import { parseCookie, stringifySetCookie } from "cookie";
import { randomBytes } from "node:crypto";
import { sql } from "./db.js";

export const SESSION_COOKIE = "wishly_session";
const SESSION_DAYS = 30;

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomToken() {
  // 32 random bytes, base64url-encoded — plenty of entropy for a session id.
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId) {
  const id = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt.toISOString()})`;
  return { id, expiresAt };
}

export async function destroySession(sessionId) {
  if (!sessionId) return;
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export function getSessionIdFromRequest(req) {
  const cookies = parseCookie(req.headers?.cookie || "");
  return cookies[SESSION_COOKIE] || null;
}

// Returns the logged-in user's { id, email } for a request, or null. Also
// cleans up the session row if it's expired, so expired sessions don't pile
// up in the table.
export async function getUserFromRequest(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;

  const rows = await sql`
    SELECT u.id, u.email, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}
  `;
  const row = rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(sessionId);
    return null;
  }

  return { id: row.id, email: row.email };
}

export function setSessionCookie(res, sessionId, expiresAt) {
  const cookie = stringifySetCookie({
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  res.setHeader("Set-Cookie", cookie);
}

// Shared guard for API routes: writes a 401 and returns null if there's no
// logged-in user, otherwise returns { id, email }. Callers should `return`
// immediately when this returns null.
export async function requireAuth(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not logged in" });
    return null;
  }
  return user;
}

export function clearSessionCookie(res) {
  const cookie = stringifySetCookie({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}
