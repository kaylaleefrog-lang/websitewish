// Vercel's Neon integration can name the connection string a few different
// things depending on how the database was connected, and prefixes every
// variable (e.g. "heh_DATABASE_URL") when the connection is given a custom
// name — so check the plain names first, then fall back to a suffix match.
const KNOWN_NAMES = ["DATABASE_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

export function getConnectionString() {
  for (const name of KNOWN_NAMES) {
    if (process.env[name]) return process.env[name];
  }
  for (const name of KNOWN_NAMES) {
    const key = Object.keys(process.env).find(k => k.endsWith(`_${name}`));
    if (key) return process.env[key];
  }
  return null;
}
