import { getSessionIdFromRequest, destroySession, clearSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sessionId = getSessionIdFromRequest(req);
  await destroySession(sessionId);
  clearSessionCookie(res);

  res.status(200).json({ ok: true });
}
