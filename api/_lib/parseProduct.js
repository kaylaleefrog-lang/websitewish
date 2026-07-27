// Pure HTML -> product-data extraction, kept separate from the network/HTTP
// layer (api/scrape.js) so it can be unit-tested with plain HTML strings.

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaTags(html) {
  const meta = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const propMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (propMatch && contentMatch) {
      const key = propMatch[1].toLowerCase();
      if (!(key in meta)) meta[key] = decodeEntities(contentMatch[1]);
    }
  }
  return meta;
}

function extractAllOgImages(html) {
  const images = [];
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const propMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (propMatch && contentMatch && /^og:image/i.test(propMatch[1])) {
      images.push(decodeEntities(contentMatch[1]));
    }
  }
  return images;
}

function* flattenJsonLd(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* flattenJsonLd(n);
    return;
  }
  if (node && typeof node === "object") {
    yield node;
    if (Array.isArray(node["@graph"])) yield* flattenJsonLd(node["@graph"]);
  }
}

function extractJsonLdProduct(html) {
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const roots = [];
  while ((m = scriptRe.exec(html))) {
    try {
      roots.push(JSON.parse(m[1].trim()));
    } catch {
      // malformed JSON-LD on the page — skip it
    }
  }
  for (const root of roots) {
    for (const node of flattenJsonLd(root)) {
      const type = node["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.some((t) => typeof t === "string" && t.toLowerCase() === "product")) {
        return node;
      }
    }
  }
  return null;
}

function parseMoney(raw) {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

// Sites that follow Google's Merchant/product structured-data guidance mark
// discounted offers with priceSpecification entries typed as ListPrice
// (original) vs SalePrice (current) — see
// https://developers.google.com/search/docs/appearance/structured-data/product
// This pulls both out when present, falling back to a single plain price.
function extractPricing(offers) {
  if (!offers) return { price: null, originalPrice: null };
  const list = Array.isArray(offers) ? offers : [offers];
  let price = null;
  let originalPrice = null;

  for (const o of list) {
    const direct = parseMoney(o.price) ?? parseMoney(o.lowPrice);
    if (direct != null && price == null) price = direct;

    const specs = o.priceSpecification
      ? Array.isArray(o.priceSpecification) ? o.priceSpecification : [o.priceSpecification]
      : [];
    for (const spec of specs) {
      const val = parseMoney(spec.price);
      if (val == null) continue;
      const type = String(spec.priceType || "").toLowerCase();
      if (type.includes("sale")) {
        price = val;
      } else if (type.includes("list") || type.includes("regular") || type.includes("strikethrough")) {
        originalPrice = val;
      } else if (price == null) {
        price = val;
      }
    }

    const listCandidate = parseMoney(o.highPrice) ?? parseMoney(o.listPrice) ?? parseMoney(o.regularPrice) ?? parseMoney(o.msrp);
    if (listCandidate != null && originalPrice == null) originalPrice = listCandidate;
  }

  if (originalPrice != null && price != null && originalPrice <= price) originalPrice = null;
  return { price, originalPrice };
}

function toAbsoluteUrl(maybeRelative, baseUrl) {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

export function parseProductFromHtml(html, baseUrl) {
  const meta = extractMetaTags(html);
  const product = extractJsonLdProduct(html);
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  const title =
    (typeof product?.name === "string" && product.name) ||
    meta["og:title"] ||
    meta["twitter:title"] ||
    (titleTagMatch ? decodeEntities(titleTagMatch[1].trim()) : null) ||
    "Untitled product";

  const description =
    (typeof product?.description === "string" && product.description) ||
    meta["og:description"] ||
    meta["twitter:description"] ||
    meta["description"] ||
    "";

  const productImages = product?.image
    ? (Array.isArray(product.image) ? product.image : [product.image]).filter((x) => typeof x === "string")
    : [];
  const ogImages = extractAllOgImages(html);
  const twitterImage = meta["twitter:image"];

  const imageCandidates = [...productImages, ...ogImages, twitterImage]
    .filter(Boolean)
    .map((u) => toAbsoluteUrl(u, baseUrl))
    .filter(Boolean);
  const images = [...new Set(imageCandidates)].slice(0, 6);

  const jsonLdPricing = extractPricing(product?.offers);
  const price =
    jsonLdPricing.price ??
    parseMoney(meta["product:sale_price:amount"]) ??
    parseMoney(meta["product:price:amount"]) ??
    parseMoney(meta["og:price:amount"]);
  let originalPrice =
    jsonLdPricing.originalPrice ??
    parseMoney(meta["product:original_price:amount"]) ??
    (meta["product:sale_price:amount"] ? parseMoney(meta["product:price:amount"]) : null);
  if (originalPrice != null && price != null && originalPrice <= price) originalPrice = null;

  const store = meta["og:site_name"] || (() => {
    try {
      return new URL(baseUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return {
    title: title.trim(),
    description: description.trim(),
    images,
    price: price != null && !isNaN(price) ? price : null,
    originalPrice: originalPrice != null && !isNaN(originalPrice) ? originalPrice : null,
    store,
  };
}
