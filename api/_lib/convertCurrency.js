// Frankfurter (European Central Bank reference rates) is free and needs no
// API key, which is why it's used here over a paid provider. Rates only
// change once a day, so a short in-memory cache avoids refetching on every
// item added within the same warm serverless instance.
const RATE_CACHE = new Map(); // currency -> { rate, fetchedAt }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

async function getRateToUsd(currency) {
  const cached = RATE_CACHE.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rate;

  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=USD`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
    );
    if (!res.ok) return cached?.rate ?? null;
    const data = await res.json();
    const rate = data?.rates?.USD;
    if (typeof rate !== "number") return cached?.rate ?? null;
    RATE_CACHE.set(currency, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    // Network hiccup or an unsupported currency code — fall back to a
    // stale cached rate if there is one, otherwise give up gracefully.
    return cached?.rate ?? null;
  }
}

// Returns null only when the input amount is null; if the rate can't be
// found, returns the original amount unconverted rather than throwing,
// so a currency lookup failure never blocks adding the item.
export async function convertToUsd(amount, fromCurrency) {
  if (amount == null) return null;
  const currency = (fromCurrency || "USD").toUpperCase();
  if (currency === "USD") return amount;

  const rate = await getRateToUsd(currency);
  if (rate == null) return amount;
  return Math.round(amount * rate * 100) / 100;
}
