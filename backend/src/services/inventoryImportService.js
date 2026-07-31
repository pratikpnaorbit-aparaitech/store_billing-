const path = require("node:path");
const os = require("node:os");
const { parse } = require("csv-parse/sync");
const readXlsxFile = require("read-excel-file/node");
const { createCanvas } = require("@napi-rs/canvas");
const { createWorker, OEM } = require("tesseract.js");
const { extractInventoryWithGemini } = require("./geminiInventoryService");

const MAX_ROWS = 150;
const MAX_PDF_PAGES = 8;
const OCR_CACHE_PATH = path.join(os.tmpdir(), "smart-billing-ocr");
const OCR_LANGUAGE = {
  en: ["eng"],
  hi: ["hin", "eng"],
  mr: ["mar", "eng"],
};

const HEADER_ALIASES = {
  barcode: [
    "barcode", "bar code", "ean", "upc", "code", "product code",
    "बारकोड", "कोड",
  ],
  name: [
    "product", "product name", "item", "item name", "name", "description",
    "उत्पाद", "उत्पाद नाम", "वस्तु", "वस्तु नाम", "नाम", "विवरण",
    "उत्पादन", "उत्पादन नाव", "वस्तू", "वस्तूचे नाव", "नाव", "तपशील",
  ],
  quantity: [
    "qty", "quantity", "stock", "units", "pieces", "pcs", "nos",
    "मात्रा", "संख्या", "नग", "स्टॉक",
    "प्रमाण", "नग", "संख्या", "साठा",
  ],
  price: [
    "price", "rate", "unit price", "mrp", "purchase price", "cost",
    "मूल्य", "कीमत", "दर", "खरीद मूल्य",
    "किंमत", "दर", "खरेदी किंमत",
  ],
};

const IGNORE_LINE = /\b(invoice|bill\s*no|date|gst|tax|subtotal|grand\s*total|total|amount|customer|supplier|mobile|phone|address|signature|thank)\b|(?:चालान|बिल\s*नंबर|दिनांक|कर|कुल|राशि|ग्राहक|पता|धन्यवाद)|(?:पावती|बिल\s*क्रमांक|दिनांक|कर|एकूण|रक्कम|ग्राहक|पत्ता|धन्यवाद)/i;
const DEVANAGARI_DIGITS = "०१२३४५६७८९";

function asciiDigits(value) {
  return String(value ?? "").replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
}

function cleanCell(value) {
  return asciiDigits(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return cleanCell(value)
    .normalize("NFKD")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function positiveInteger(value) {
  const number = Number(asciiDigits(value).replace(/[^\d.-]/g, ""));
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeMoney(value) {
  const number = Number(asciiDigits(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function headerKey(value) {
  const normalized = normalizeText(value);
  return Object.entries(HEADER_ALIASES)
    .find(([, aliases]) => aliases.some((alias) => normalizeText(alias) === normalized))?.[0] || null;
}

function findHeader(rows) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const columns = {};
    rows[rowIndex].forEach((value, columnIndex) => {
      const key = headerKey(value);
      if (key && columns[key] === undefined) columns[key] = columnIndex;
    });
    if (columns.name !== undefined && columns.quantity !== undefined) {
      return { rowIndex, columns };
    }
  }
  return null;
}

function tableRows(rows) {
  const header = findHeader(rows);
  if (!header) return [];
  const candidates = [];
  for (const row of rows.slice(header.rowIndex + 1)) {
    const name = cleanCell(row[header.columns.name]);
    const quantity = positiveInteger(row[header.columns.quantity]);
    if (!name || !quantity || IGNORE_LINE.test(name)) continue;
    const barcode = header.columns.barcode === undefined
      ? ""
      : cleanCell(row[header.columns.barcode]).replace(/\D/g, "");
    const price = header.columns.price === undefined
      ? null
      : nonNegativeMoney(row[header.columns.price]);
    candidates.push({
      rawText: row.map(cleanCell).filter(Boolean).join(" | "),
      name,
      quantity,
      barcode: /^\d{8,14}$/.test(barcode) ? barcode : "",
      price,
      confidence: 1,
      warning: "",
    });
    if (candidates.length >= MAX_ROWS) break;
  }
  return candidates;
}

function freeTextRow(line) {
  const rawText = cleanCell(line);
  if (!rawText || rawText.length < 2 || IGNORE_LINE.test(rawText)) return null;
  const barcodeMatch = rawText.match(/(?:^|\D)(\d{8,14})(?:\D|$)/);
  const explicitQuantity = rawText.match(
    /(?:qty|quantity|qnty|stock|pcs?|pieces?|nos?|units?|नग|संख्या|मात्रा|प्रमाण|साठा)\s*[:=\-x×]?\s*(\d{1,5})/i,
  ) || rawText.match(/\b(\d{1,5})\s*(?:pcs?|pieces?|nos?|units?|नग)\b/i);
  const multiplicationQuantity = rawText.match(/\b(?:x|×)\s*(\d{1,5})\b/i);
  const quantity = positiveInteger(explicitQuantity?.[1] || multiplicationQuantity?.[1]) || 1;
  let name = rawText
    .replace(barcodeMatch?.[1] || /$^/, " ")
    .replace(explicitQuantity?.[0] || /$^/, " ")
    .replace(multiplicationQuantity?.[0] || /$^/, " ")
    .replace(/[₹$]\s*\d+(?:\.\d{1,2})?/g, " ")
    .replace(/\s+\d+(?:\.\d{1,2})?\s*$/, " ")
    .replace(/^[\d.)\-\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 2 || !/\p{L}/u.test(name)) return null;
  return {
    rawText,
    name,
    quantity,
    barcode: barcodeMatch?.[1] || "",
    price: null,
    confidence: explicitQuantity || multiplicationQuantity ? 0.78 : 0.52,
    warning: explicitQuantity || multiplicationQuantity
      ? ""
      : "Quantity was not clear; please verify the default quantity.",
  };
}

function freeTextRows(text) {
  const candidates = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const candidate = freeTextRow(line);
    if (candidate) candidates.push(candidate);
    if (candidates.length >= MAX_ROWS) break;
  }
  return candidates;
}

async function rowsFromWorkbook(buffer) {
  return readXlsxFile(buffer);
}

async function textFromPdf(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true,
  }).promise;
  const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);
  const pageTexts = [];
  const pageImages = [];
  for (let index = 1; index <= pageCount; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str || "").join(" ").trim();
    if (pageText.length >= 20) {
      pageTexts.push(pageText);
      continue;
    }
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    pageImages.push(canvas.toBuffer("image/png"));
  }
  return { text: pageTexts.join("\n"), pageImages, pageCount: document.numPages };
}

async function recognizeImages(images, language) {
  const worker = await createWorker(
    OCR_LANGUAGE[language] || OCR_LANGUAGE.en,
    OEM.LSTM_ONLY,
    { cachePath: OCR_CACHE_PATH },
  );
  try {
    const texts = [];
    let confidenceTotal = 0;
    for (const image of images) {
      const result = await worker.recognize(image);
      texts.push(result.data.text || "");
      confidenceTotal += Number(result.data.confidence || 0);
    }
    return {
      text: texts.join("\n"),
      confidence: images.length ? confidenceTotal / images.length / 100 : 0,
    };
  } finally {
    await worker.terminate();
  }
}

function tokenScore(left, right) {
  const leftTokens = new Set(normalizeText(left).split(" ").filter((token) => token.length > 1));
  const rightTokens = new Set(normalizeText(right).split(" ").filter((token) => token.length > 1));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let matches = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) matches += 1;
  return (2 * matches) / (leftTokens.size + rightTokens.size);
}

function matchCandidates(candidates, products) {
  const barcodeMap = new Map(products.map((product) => [String(product.barcode || ""), product]));
  const searchable = products.map((product) => ({
    product,
    normalized: normalizeText(`${product.brand || ""} ${product.name || ""}`),
  }));
  return candidates.map((candidate, index) => {
    let product = candidate.barcode ? barcodeMap.get(candidate.barcode) : null;
    let score = product ? 1 : 0;
    const normalizedCandidate = normalizeText(candidate.name);
    if (!product && normalizedCandidate) {
      for (const entry of searchable) {
        let currentScore = tokenScore(normalizedCandidate, entry.normalized);
        if (entry.normalized === normalizedCandidate) currentScore = 1;
        else if (entry.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(entry.normalized)) {
          currentScore = Math.max(currentScore, 0.86);
        }
        if (currentScore > score) {
          score = currentScore;
          product = entry.product;
        }
      }
    }
    const accepted = Boolean(product && score >= 0.58);
    return {
      id: `row-${index + 1}`,
      ...candidate,
      matched: accepted,
      matchScore: accepted ? Number(score.toFixed(2)) : Number(score.toFixed(2)),
      product: accepted ? {
        id: String(product.id || product._id),
        name: product.name,
        barcode: product.barcode,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        category: product.category || "Grocery",
        unit: product.unit || "1 pc",
        catalogue: Boolean(product.catalogue),
      } : null,
      include: accepted,
    };
  });
}

function fileKind(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".bmp"].includes(extension)) return "image";
  if (mime === "application/pdf" || extension === ".pdf") return "pdf";
  if ([".xlsx", ".xlsm"].includes(extension) || mime.includes("spreadsheetml")) return "excel";
  if ([".csv", ".tsv", ".txt"].includes(extension) || mime.includes("csv") || mime.startsWith("text/")) return "text";
  return "unsupported";
}

async function parseInventoryFile(file, language = "en") {
  const kind = fileKind(file);
  let candidates = [];
  let extractedText = "";
  let ocrConfidence = null;
  let pageCount = null;
  let extractionEngine = "structured-parser";
  if (kind === "excel") {
    const rows = await rowsFromWorkbook(file.buffer);
    candidates = tableRows(rows);
    if (!candidates.length) extractedText = rows.map((row) => row.map(cleanCell).join(" ")).join("\n");
  } else if (kind === "text") {
    const delimiter = path.extname(file.originalname || "").toLowerCase() === ".tsv" ? "\t" : undefined;
    const text = file.buffer.toString("utf8");
    const rows = parse(text, {
      bom: true,
      delimiter,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });
    candidates = tableRows(rows);
    if (!candidates.length) extractedText = text;
  } else if (kind === "pdf") {
    try {
      candidates = await extractInventoryWithGemini(file, kind) || [];
      if (candidates.length) extractionEngine = "gemini";
    } catch (error) {
      console.warn("Gemini PDF extraction failed; using local OCR", error.message);
    }
    if (!candidates.length) {
      const pdf = await textFromPdf(file.buffer);
      extractedText = pdf.text;
      pageCount = pdf.pageCount;
      if (pdf.pageImages.length) {
        const recognized = await recognizeImages(pdf.pageImages, language);
        extractedText = `${extractedText}\n${recognized.text}`.trim();
        ocrConfidence = recognized.confidence;
      }
      extractionEngine = "local-ocr";
    }
  } else if (kind === "image") {
    try {
      candidates = await extractInventoryWithGemini(file, kind) || [];
      if (candidates.length) extractionEngine = "gemini";
    } catch (error) {
      console.warn("Gemini image extraction failed; using local OCR", error.message);
    }
    if (!candidates.length) {
      const recognized = await recognizeImages([file.buffer], language);
      extractedText = recognized.text;
      ocrConfidence = recognized.confidence;
      extractionEngine = "local-ocr";
    }
  } else {
    const error = new Error("Use a JPG, PNG, WebP, PDF, CSV or Excel file.");
    error.status = 415;
    throw error;
  }
  if (!candidates.length) {
    candidates = freeTextRows(extractedText);
    if (process.env.GEMINI_API_KEY && extractedText) {
      try {
        const geminiRows = await extractInventoryWithGemini(file, "text", extractedText);
        if (geminiRows?.length) {
          candidates = geminiRows;
          extractionEngine = "gemini";
        }
      } catch (error) {
        console.warn("Gemini text extraction failed; keeping parsed rows", error.message);
      }
    }
  }
  return {
    kind,
    candidates,
    extractedText: extractedText.slice(0, 12000),
    ocrConfidence,
    pageCount,
    extractionEngine,
  };
}

module.exports = {
  asciiDigits,
  cleanCell,
  freeTextRow,
  freeTextRows,
  matchCandidates,
  normalizeText,
  parseInventoryFile,
  tableRows,
};
