const mongoose = require("mongoose");
const Product = require("../models/Product");
const getCloudinary = require("../config/cloudinary");
const {
  catalogueMetadata,
  catalogueProduct,
  mergedProducts,
  virtualProduct,
} = require("../services/catalogueService");

async function destroyImage(publicId) {
  const cloudinary = getCloudinary();
  if (cloudinary && publicId) {
    try { await cloudinary.uploader.destroy(publicId, { resource_type: "image" }); }
    catch (error) { console.error("Unable to remove old product image", error.message); }
  }
}

function productPayload(body, fallback = {}) {
  return {
    name: String(body.name ?? fallback.name ?? "").trim(),
    brand: String(body.brand ?? fallback.brand ?? "").trim(),
    barcode: String(body.barcode ?? fallback.barcode ?? "").trim(),
    category: String(body.category ?? fallback.category ?? "General").trim(),
    price: Number(body.price ?? fallback.price ?? 0),
    stock: Number(body.stock ?? fallback.stock ?? 0),
    unit: String(body.unit ?? fallback.unit ?? "1 pc").trim(),
    image: typeof body.image === "string" ? body.image : (fallback.image || ""),
    imagePublicId: typeof body.imagePublicId === "string"
      ? body.imagePublicId
      : (fallback.imagePublicId || ""),
  };
}

function validateProduct(product, { allowZeroPrice = false } = {}) {
  if (!product.name || !product.barcode) return "Product name and barcode are required";
  if (!Number.isFinite(product.price) || product.price < 0 || (!allowZeroPrice && product.price === 0)) {
    return allowZeroPrice ? "Price must be zero or more" : "Price must be greater than zero";
  }
  if (!Number.isInteger(product.stock) || product.stock < 0) {
    return "Stock must be a whole number of zero or more";
  }
  return null;
}

async function materializeCatalogue(owner, catalogueEntry, changes = {}) {
  const payload = productPayload({ ...changes, barcode: catalogueEntry.barcode }, {
    ...catalogueEntry,
    stock: 0,
  });
  const validationError = validateProduct(payload, { allowZeroPrice: true });
  if (validationError) {
    const error = new Error(validationError);
    error.status = 400;
    throw error;
  }
  return Product.findOneAndUpdate(
    { owner, barcode: catalogueEntry.barcode },
    { ...payload, owner, source: "catalogue", active: true },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
}

function isCatalogueId(id) {
  return String(id || "").startsWith("catalog:");
}

function barcodeFromCatalogueId(id) {
  return String(id || "").slice("catalog:".length);
}

async function remoteBarcodeProduct(barcode) {
  const fields = [
    "code",
    "product_name",
    "product_name_en",
    "brands",
    "categories",
    "categories_tags",
    "quantity",
    "image_front_small_url",
    "product_type",
  ].join(",");
  const urls = [
    `https://world.openfoodfacts.net/api/v3/product/${encodeURIComponent(barcode)}?product_type=all&fields=${fields}`,
    `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}?product_type=all&fields=${fields}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "SmartBilling/1.0 (contact: krushnarathod.aparaitech@gmail.com)",
        },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const raw = data.product || data;
      const name = String(raw.product_name || raw.product_name_en || "").trim();
      if (!name) continue;
      return {
        barcode,
        name,
        brand: String(raw.brands || "").trim(),
        category: "Grocery",
        price: 0,
        stock: 0,
        unit: String(raw.quantity || "1 pc").trim(),
        image: String(raw.image_front_small_url || ""),
        priceSource: "unset",
        source: "catalogue",
      };
    } catch {
      // Try the next public endpoint.
    }
  }
  return null;
}

exports.createProduct = async (req, res) => {
  try {
    const catalogueEntry = catalogueProduct(req.body.barcode);
    if (catalogueEntry) {
      const product = await materializeCatalogue(req.userId, catalogueEntry, req.body);
      return res.status(201).json({ success: true, data: { ...product.toObject(), catalogue: true } });
    }
    const payload = productPayload(req.body);
    const validationError = validateProduct(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const product = await Product.create({
      ...payload,
      owner: req.userId,
      source: req.body.source === "import" ? "import" : "custom",
    });
    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.code === 11000 ? "Barcode already exists" : error.message,
    });
  }
};

exports.getProducts = async (req, res) => {
  const userProducts = await Product.find({ owner: req.userId });
  const products = mergedProducts(userProducts);
  res.json({
    success: true,
    count: products.length,
    catalogue: catalogueMetadata,
    data: products,
  });
};

exports.lookupProduct = async (req, res) => {
  const barcode = String(req.params.barcode || "").trim();
  if (!/^\d{8,14}$/.test(barcode)) {
    return res.status(400).json({ success: false, message: "Enter a valid barcode" });
  }
  const override = await Product.findOne({ owner: req.userId, barcode });
  if (override) {
    if (!override.active) {
      return res.status(404).json({ success: false, code: "PRODUCT_HIDDEN", message: "Product was removed from your catalogue" });
    }
    return res.json({ success: true, data: override });
  }
  const local = catalogueProduct(barcode);
  if (local) return res.json({ success: true, data: virtualProduct(local) });
  const remote = await remoteBarcodeProduct(barcode);
  if (!remote) return res.status(404).json({ success: false, message: "Product not found" });
  return res.json({
    success: true,
    data: {
      ...remote,
      _id: `catalog:${barcode}`,
      id: `catalog:${barcode}`,
      active: true,
      catalogue: true,
      virtual: true,
    },
  });
};

exports.updateProduct = async (req, res) => {
  try {
    if (isCatalogueId(req.params.id)) {
      const barcode = barcodeFromCatalogueId(req.params.id);
      const catalogueEntry = catalogueProduct(barcode) || {
        barcode,
        name: req.body.name,
        brand: req.body.brand,
        category: req.body.category,
        price: req.body.price,
        unit: req.body.unit,
        image: req.body.image,
      };
      const product = await materializeCatalogue(req.userId, catalogueEntry, req.body);
      return res.json({ success: true, data: { ...product.toObject(), catalogue: true } });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const existing = await Product.findOne({ _id: req.params.id, owner: req.userId, active: true });
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });
    const payload = productPayload(req.body, existing);
    const validationError = validateProduct(payload, { allowZeroPrice: existing.source === "catalogue" });
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, active: true },
      payload,
      { returnDocument: "after", runValidators: true },
    );
    if (existing.imagePublicId && existing.imagePublicId !== product.imagePublicId) {
      await destroyImage(existing.imagePublicId);
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.code === 11000 ? "Barcode already exists" : error.message,
    });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const hasSetStock = req.body.stock !== undefined;
    const stock = Number(req.body.stock);
    const delta = Number(req.body.delta);
    if (hasSetStock && (!Number.isInteger(stock) || stock < 0)) {
      return res.status(400).json({ success: false, message: "Stock must be a whole number of zero or more" });
    }
    if (!hasSetStock && (!Number.isInteger(delta) || delta === 0)) {
      return res.status(400).json({ success: false, message: "Stock change must be a non-zero whole number" });
    }
    let product;
    if (isCatalogueId(req.params.id)) {
      const barcode = barcodeFromCatalogueId(req.params.id);
      const catalogueEntry = catalogueProduct(barcode);
      if (!catalogueEntry) return res.status(404).json({ success: false, message: "Product not found" });
      product = await materializeCatalogue(req.userId, catalogueEntry, {
        stock: hasSetStock ? stock : Math.max(0, delta),
      });
    } else {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
      product = await Product.findOne({ _id: req.params.id, owner: req.userId, active: true });
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      product.stock = hasSetStock ? stock : Math.max(0, Number(product.stock || 0) + delta);
      await product.save();
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  let product;
  if (isCatalogueId(req.params.id)) {
    const barcode = barcodeFromCatalogueId(req.params.id);
    const entry = catalogueProduct(barcode);
    if (!entry) return res.status(404).json({ success: false, message: "Product not found" });
    product = await Product.findOneAndUpdate(
      { owner: req.userId, barcode },
      {
        ...productPayload({}, entry),
        owner: req.userId,
        source: "catalogue",
        active: false,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
  } else {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, active: true },
      { active: false },
      { returnDocument: "after" },
    );
  }
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  await destroyImage(product.imagePublicId);
  return res.json({ success: true, message: "Product deleted" });
};
