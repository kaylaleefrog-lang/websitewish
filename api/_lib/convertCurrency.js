// Two free, keyless providers, tried in order — open.er-api.com covers a
// much wider set of currencies (190+) than Frankfurter's ECB-only list
// (~30), so it goes first; Frankfurter is a fallback for when it's down.
// Rates only change once a day, so a short in-memory cache avoids
// refetching on every item added within the same warm serverless instance.
const RATE_CACHE = new Map(); // currency -> { rate, fetchedAt }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

async function fetchRateFromOpenErApi(currency) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(currency)}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const rate = data?.rates?.USD;
  return typeof rate === "number" ? rate : null;
}

async function fetchRateFromFrankfurter(currency) {
  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=USD`,
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const rate = data?.rates?.USD;
  return typeof rate === "number" ? rate : null;
}

async function getRateToUsd(currency) {
  const cached = RATE_CACHE.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rate;

  for (const fetchRate of [fetchRateFromOpenErApi, fetchRateFromFrankfurter]) {
    try {
      const rate = await fetchRate(currency);
      if (rate != null) {
        RATE_CACHE.set(currency, { rate, fetchedAt: Date.now() });
        return rate;
      }
    } catch {
      // try the next provider
    }
  }
  return cached?.rate ?? null;
}

// Returns null if the amount is missing, or if the currency isn't USD and
// no rate could be found — showing the raw foreign-currency number as if
// it were dollars would be actively misleading (e.g. a 92,000 KRW item
// showing as "$92,000"), so a failed conversion means "no price" rather
// than a wrong one. The item itself still gets added either way.
export async function convertToUsd(amount, fromCurrency) {
  if (amount == null) return null;
  const currency = (fromCurrency || "USD").toUpperCase();
  if (currency === "USD") return amount;

  const rate = await getRateToUsd(currency);
  if (rate == null) return null;
  return Math.round(amount * rate * 100) / 100;
}
