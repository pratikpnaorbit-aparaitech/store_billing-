const fs = require("node:fs");
const path = require("node:path");

const USER_AGENT = "SmartBilling/1.0 (contact: krushnarathod.aparaitech@gmail.com)";
const PAGE_SIZE = 100;
const OUTPUT = path.join(__dirname, "..", "data", "catalogue.json");

const SOURCES = [
  {
    key: "food",
    baseUrls: ["https://world.openfoodfacts.org", "https://world.openfoodfacts.net"],
    limit: 5000,
    defaultCategory: "Grocery",
    segments: [
      { key: "popular", limit: 800 },
      { key: "snacks", limit: 350, category: "snacks" },
      { key: "drinks", limit: 350, category: "beverages" },
      { key: "dairy", limit: 350, category: "dairies" },
      { key: "grains", limit: 350, category: "cereals-and-potatoes" },
      { key: "pulses", limit: 350, category: "legumes" },
      { key: "spices", limit: 350, category: "spices" },
      { key: "bakery", limit: 350, category: "breads" },
      { key: "breakfast", limit: 350, category: "breakfasts" },
      { key: "sauces", limit: 350, category: "sauces" },
      { key: "sweets", limit: 350, category: "confectioneries" },
      { key: "instant", limit: 350, category: "instant-foods" },
      { key: "frozen", limit: 300, category: "frozen-foods" },
      { key: "produce", limit: 300, category: "plant-based-foods-and-beverages" },
    ],
  },
  {
    key: "beauty",
    baseUrls: ["https://world.openbeautyfacts.org"],
    limit: 900,
    defaultCategory: "Personal Care",
  },
  {
    key: "product",
    baseUrls: ["https://world.openproductsfacts.org"],
    limit: 600,
    defaultCategory: "Household",
  },
  {
    key: "petfood",
    baseUrls: ["https://world.openpetfoodfacts.org"],
    limit: 50,
    defaultCategory: "Pet Care",
  },
];

const CATEGORY_RULES = [
  ["Personal Care", /beauty|cosmetic|skin|hair|shampoo|conditioner|soap|deodor|tooth|oral|face|body care/],
  ["Household", /household|clean|detergent|dishwash|laundry|toilet|tissue|paper towel|garbage|insect/],
  ["Medicine", /medicine|pharma|tablet|capsule|health supplement|first aid|antiseptic/],
  ["Pet Care", /\bpet(?: food| care)?\b|\bdog(?: food)?\b|\bcat(?: food)?\b|animal food/],
  ["Dairy", /dairy|milk|cheese|yogurt|curd|butter|ghee|cream/],
  ["Snacks", /snack|chip|crisp|biscuit|cookie|chocolate|candy|sweet|namkeen/],
  ["Grains", /grain|rice|wheat|flour|atta|cereal|oat|millet|rava|semolina/],
  ["Pulses", /pulse|dal|lentil|legume|bean|chickpea/],
  ["Spices", /spice|masala|seasoning|salt|pepper|turmeric|chilli/],
  ["Bakery", /bakery|bread|cake|pastry|bun|rusk/],
  ["Frozen", /frozen|ice cream/],
  ["Produce", /fruit|vegetable|produce/],
  ["Stationery", /stationery|pen|pencil|notebook|paper product/],
  ["Drinks", /\bbeverage\b|\bdrink\b|juice|water|soda|cola|coffee|tea/],
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function jsonRequest(url, attempt = 1) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (attempt < 4) {
      await delay(800 * attempt);
      return jsonRequest(url, attempt + 1);
    }
    throw error;
  }
  if (response.ok) return response.json();
  if (attempt < 4 && [429, 500, 502, 503, 504].includes(response.status)) {
    await delay(800 * attempt);
    return jsonRequest(url, attempt + 1);
  }
  throw new Error(`${url} returned HTTP ${response.status}`);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function categoryFor(product, fallback) {
  const haystack = `${product.categories || ""} ${(product.categories_tags || []).join(" ")}`
    .toLowerCase()
    .replaceAll("plant-based-foods-and-beverages", "")
    .replaceAll("plant based foods and beverages", "");
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || fallback;
}

function normalizedProduct(product, source, prices) {
  const barcode = cleanText(product.code);
  const name = cleanText(product.product_name || product.product_name_en);
  if (!/^\d{8,14}$/.test(barcode) || !name) return null;
  const priceRecord = prices.get(barcode);
  return {
    barcode,
    name,
    brand: cleanText(product.brands),
    category: source.key === "food"
      ? categoryFor(product, source.defaultCategory)
      : source.defaultCategory,
    price: priceRecord?.price || 0,
    priceDate: priceRecord?.date || null,
    priceSource: priceRecord ? "Open Prices INR" : "unset",
    unit: cleanText(product.quantity) || "1 pc",
    image: cleanText(product.image_front_small_url),
    source: `open-${source.key}-facts`,
    popularity: Number(product.unique_scans_n || 0),
  };
}

async function loadInrPrices() {
  const prices = new Map();
  for (let offset = 0; ; offset += 100) {
    const url = new URL("https://datasets-server.huggingface.co/filter");
    url.searchParams.set("dataset", "openfoodfacts/open-prices");
    url.searchParams.set("config", "default");
    url.searchParams.set("split", "prices");
    url.searchParams.set("where", "\"currency\"='INR'");
    url.searchParams.set("orderby", "\"date\" DESC");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("length", "100");
    const data = await jsonRequest(url);
    for (const wrapper of data.rows || []) {
      const row = wrapper.row || {};
      const code = cleanText(row.product_code);
      const price = Number(row.price);
      if (/^\d{8,14}$/.test(code) && price > 0 && !prices.has(code)) {
        prices.set(code, { price, date: row.date || null });
      }
    }
    if (offset + 100 >= Number(data.num_rows_total || 0)) break;
  }
  return prices;
}

async function loadSegment(source, segment, prices) {
  const products = [];
  const seen = new Set();
  const limit = Math.min(segment.limit || source.limit, 1000);
  const pages = Math.ceil(limit / PAGE_SIZE);
  for (let page = 1; page <= pages && products.length < limit; page += 1) {
    let data = null;
    let lastError = null;
    for (const baseUrl of source.baseUrls) {
      const url = new URL("/api/v2/search", baseUrl);
      url.searchParams.set("countries_tags_en", "india");
      if (segment.category) url.searchParams.set("categories_tags_en", segment.category);
      url.searchParams.set(
        "fields",
        "code,product_name,product_name_en,brands,categories,categories_tags,quantity,image_front_small_url,product_type,unique_scans_n",
      );
      url.searchParams.set("sort_by", "unique_scans_n");
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(PAGE_SIZE));
      try {
        data = await jsonRequest(url);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!data) {
      console.warn(`Skipping ${source.key}/${segment.key} page ${page}: ${lastError?.message || "request failed"}`);
      break;
    }
    for (const rawProduct of data.products || []) {
      const product = normalizedProduct(rawProduct, source, prices);
      if (product && !seen.has(product.barcode)) {
        seen.add(product.barcode);
        products.push(product);
      }
    }
    await delay(300);
  }
  return products;
}

async function loadSource(source, prices) {
  const products = [];
  const seen = new Set();
  const segments = source.segments || [{ key: "popular", limit: source.limit }];
  for (const segment of segments) {
    const segmentProducts = await loadSegment(source, segment, prices);
    for (const product of segmentProducts) {
      if (!seen.has(product.barcode)) {
        seen.add(product.barcode);
        products.push(product);
      }
      if (products.length >= source.limit) return products;
    }
  }
  return products;
}

async function main() {
  const prices = await loadInrPrices();
  const allProducts = [];
  const seen = new Set();
  const sourceCounts = {};
  for (const source of SOURCES) {
    const sourceProducts = await loadSource(source, prices);
    sourceCounts[source.key] = sourceProducts.length;
    for (const product of sourceProducts) {
      if (!seen.has(product.barcode)) {
        seen.add(product.barcode);
        allProducts.push(product);
      }
    }
  }
  allProducts.sort((left, right) => (
    right.popularity - left.popularity
    || left.name.localeCompare(right.name, "en")
  ));
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify({
    metadata: {
      version: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      productCount: allProducts.length,
      sourceCounts,
      attribution: "Product data: Open Food Facts family (ODbL). Price observations: Open Prices.",
      productLicense: "ODbL-1.0",
      priceApiLicense: "AGPL-3.0",
    },
    products: allProducts,
  })}\n`);
  console.log(JSON.stringify({ output: OUTPUT, products: allProducts.length, sourceCounts }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
