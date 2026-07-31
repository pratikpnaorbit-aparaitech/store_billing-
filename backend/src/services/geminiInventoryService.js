const MAX_ROWS = 150;

const INVENTORY_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    required: ["name", "quantity", "price", "barcode", "unit"],
    properties: {
      name: { type: "STRING" },
      quantity: { type: "INTEGER" },
      price: { type: "NUMBER" },
      barcode: { type: "STRING" },
      unit: { type: "STRING" },
    },
  },
};

const PROMPT = `You are an extremely careful inventory extraction engine for an Indian retail billing app.
Read every product row from the supplied bill, invoice, stock sheet, PDF, CSV text or photograph.

Rules:
- Return one object per actual sellable product line, in the same order as the document.
- Never return headings, supplier details, dates, GST/tax rows, subtotals, totals, discounts or payment information.
- Keep each product name complete. Do not merge neighboring rows.
- quantity is the stock/count for that row, not a serial number, tax rate or price.
- price is the per-unit product price/rate/MRP when available, not the line total.
- Preserve pack size in unit (for example 500 ml, 19 g, 1 pc).
- Read English, Hindi and Marathi text.
- If quantity is genuinely absent, use 1. If price is absent, use 0.
- Return valid JSON matching the requested schema only.`;

function normalizedMime(file, kind) {
  const mime = String(file.mimetype || "").toLowerCase();
  if (kind === "pdf") return "application/pdf";
  if (kind === "image") {
    if (["image/jpeg", "image/png", "image/webp"].includes(mime)) return mime;
    return "image/jpeg";
  }
  return "text/plain";
}

function cleanRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_ROWS).flatMap((row) => {
    const name = String(row?.name || "").replace(/\s+/g, " ").trim();
    const quantity = Math.trunc(Number(row?.quantity));
    const price = Number(row?.price);
    const barcode = String(row?.barcode || "").replace(/\D/g, "");
    const unit = String(row?.unit || "1 pc").replace(/\s+/g, " ").trim() || "1 pc";
    if (!name || name.length < 2 || !Number.isInteger(quantity) || quantity < 1) return [];
    return [{
      rawText: [name, `Qty ${quantity}`, Number.isFinite(price) ? `Price ${price}` : ""].filter(Boolean).join(" | "),
      name,
      quantity,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      barcode: /^\d{8,14}$/.test(barcode) ? barcode : "",
      unit,
      confidence: 0.96,
      warning: "",
    }];
  });
}

async function extractInventoryWithGemini(file, kind, text = "") {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  const model = String(process.env.GEMINI_OCR_MODEL || "gemini-3.5-flash").trim();
  const fallbackModel = String(process.env.GEMINI_OCR_FALLBACK_MODEL || "gemini-3.5-flash-lite").trim();
  const parts = [{ text: PROMPT }];
  if (kind === "image" || kind === "pdf") {
    parts.push({
      inlineData: {
        mimeType: normalizedMime(file, kind),
        data: file.buffer.toString("base64"),
      },
    });
  } else {
    parts.push({ text: String(text || file.buffer.toString("utf8")).slice(0, 120000) });
  }

  const models = [...new Set([model, fallbackModel].filter(Boolean))];
  let result;
  for (let index = 0; index < models.length; index += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(models[index])}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            ...(models[index] === model ? { responseSchema: INVENTORY_SCHEMA } : {}),
          },
        }),
        signal: AbortSignal.timeout(110000),
      },
    );
    result = await response.json().catch(() => ({}));
    if (response.ok) break;
    const retryable = [429, 503].includes(response.status) && index < models.length - 1;
    if (retryable) continue;
    const error = new Error(result?.error?.message || "Gemini could not read this inventory document");
    error.status = response.status;
    throw error;
  }
  const output = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!output) throw new Error("Gemini returned no inventory rows");
  return cleanRows(JSON.parse(output));
}

module.exports = { extractInventoryWithGemini };
