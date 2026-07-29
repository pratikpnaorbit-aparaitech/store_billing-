const crypto = require("node:crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const Product = require("../models/Product");
const {
  catalogueProduct,
  mergedProducts,
} = require("../services/catalogueService");
const {
  matchCandidates,
  parseInventoryFile,
} = require("../services/inventoryImportService");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
});

function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "File is too large. Maximum size is 12 MB."
      : error.message;
    return res.status(400).json({ success: false, message });
  });
}

function safeBarcode(item, index) {
  const barcode = String(item.barcode || "").trim();
  if (/^\d{8,14}$/.test(barcode) || /^MANUAL-/i.test(barcode)) return barcode;
  const digest = crypto
    .createHash("sha1")
    .update(`${item.name || ""}:${Date.now()}:${index}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `MANUAL-IMPORT-${digest}`;
}

exports.uploadInventoryFile = uploadSingle;

exports.previewInventoryImport = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Choose a bill or stock file first." });
    }
    const language = ["en", "hi", "mr"].includes(req.body.language) ? req.body.language : "en";
    const [parsed, userProducts] = await Promise.all([
      parseInventoryFile(req.file, language),
      Product.find({ owner: req.userId }),
    ]);
    const candidates = matchCandidates(parsed.candidates, mergedProducts(userProducts));
    return res.json({
      success: true,
      data: {
        document: {
          name: req.file.originalname,
          kind: parsed.kind,
          size: req.file.size,
          pageCount: parsed.pageCount,
          ocrConfidence: parsed.ocrConfidence,
        },
        extractedText: parsed.extractedText,
        candidates,
        summary: {
          rows: candidates.length,
          matched: candidates.filter((item) => item.matched).length,
          needsReview: candidates.filter((item) => !item.matched || item.warning).length,
        },
      },
    });
  } catch (error) {
    console.error("Inventory preview failed", error);
    return res.status(error.status || 422).json({
      success: false,
      message: error.message || "The document could not be read.",
    });
  }
};

exports.applyInventoryImport = async (req, res) => {
  try {
    const selected = Array.isArray(req.body.items)
      ? req.body.items.filter((item) => item.include !== false)
      : [];
    if (!selected.length || selected.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Choose between 1 and 150 reviewed stock rows.",
      });
    }

    const objectIds = selected
      .map((item) => String(item.productId || ""))
      .filter((id) => mongoose.isValidObjectId(id));
    const ownedProducts = await Product.find({
      _id: { $in: objectIds },
      owner: req.userId,
      active: true,
    });
    const ownedById = new Map(ownedProducts.map((product) => [String(product._id), product]));
    const aggregates = new Map();

    selected.forEach((item, index) => {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000000) {
        const error = new Error(`Row ${index + 1} has an invalid quantity.`);
        error.status = 400;
        throw error;
      }
      const productId = String(item.productId || "");
      const owned = ownedById.get(productId);
      const catalogBarcode = productId.startsWith("catalog:") ? productId.slice(8) : "";
      const catalog = catalogueProduct(catalogBarcode || item.barcode);
      if (productId && !owned && !catalog) {
        const error = new Error(`Row ${index + 1} must be matched to a valid product.`);
        error.status = 400;
        throw error;
      }
      const barcode = owned?.barcode || catalog?.barcode || safeBarcode(item, index);
      const base = owned || catalog || {
        name: String(item.name || "").trim(),
        category: String(item.category || "Grocery").trim(),
        price: Number(item.price || 0),
        unit: String(item.unit || "1 pc").trim(),
        brand: "",
        image: "",
      };
      if (!base.name) {
        const error = new Error(`Row ${index + 1} needs a product name.`);
        error.status = 400;
        throw error;
      }
      const existing = aggregates.get(barcode);
      aggregates.set(barcode, {
        barcode,
        quantity: quantity + Number(existing?.quantity || 0),
        base,
        source: owned?.source || (catalog ? "catalogue" : "import"),
      });
    });

    const operations = Array.from(aggregates.values()).map(({ barcode, quantity, base, source }) => ({
      updateOne: {
        filter: { owner: req.userId, barcode },
        update: {
          $set: { active: true },
          $setOnInsert: {
            owner: req.userId,
            barcode,
            name: String(base.name).trim(),
            brand: String(base.brand || "").trim(),
            category: String(base.category || "Grocery").trim(),
            price: Math.max(0, Number(base.price || 0)),
            unit: String(base.unit || "1 pc").trim(),
            image: String(base.image || ""),
            imagePublicId: "",
            source,
          },
          $inc: { stock: quantity },
        },
        upsert: true,
        setDefaultsOnInsert: false,
      },
    }));
    await Product.bulkWrite(operations, { ordered: true });
    const products = await Product.find({
      owner: req.userId,
      barcode: { $in: Array.from(aggregates.keys()) },
      active: true,
    });
    return res.json({
      success: true,
      data: {
        products,
        rowsApplied: selected.length,
        productsUpdated: products.length,
        unitsAdded: selected.reduce((total, item) => total + Number(item.quantity), 0),
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.code === 11000 ? "A product barcode is duplicated." : error.message,
    });
  }
};
