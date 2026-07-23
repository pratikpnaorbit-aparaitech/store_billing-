const Product = require("../models/Product");
const getCloudinary = require("../config/cloudinary");

async function destroyImage(publicId) {
  const cloudinary = getCloudinary();
  if (cloudinary && publicId) {
    try { await cloudinary.uploader.destroy(publicId, { resource_type: "image" }); }
    catch (error) { console.error("Unable to remove old product image", error.message); }
  }
}

function productPayload(body) {
  return {
    name: String(body.name || "").trim(),
    barcode: String(body.barcode || "").trim(),
    category: String(body.category || "General").trim(),
    price: Number(body.price),
    stock: Number(body.stock || 0),
    unit: String(body.unit || "1 pc").trim(),
    image: typeof body.image === "string" ? body.image : "",
    imagePublicId: typeof body.imagePublicId === "string" ? body.imagePublicId : "",
  };
}

function validateProduct(product) {
  if (!product.name || !product.barcode) return "Product name and barcode are required";
  if (!Number.isFinite(product.price) || product.price <= 0) return "Price must be greater than zero";
  if (!Number.isInteger(product.stock) || product.stock < 0) return "Stock must be a whole number of zero or more";
  return null;
}

exports.createProduct = async (req, res) => {
  try {
    const payload = productPayload(req.body);
    const validationError = validateProduct(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const product = await Product.create({ ...payload, owner: req.userId });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.code === 11000 ? "Barcode already exists" : error.message });
  }
};

exports.getProducts = async (req, res) => {
  const products = await Product.find({ owner: req.userId, active: true }).sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, data: products });
};

exports.updateProduct = async (req, res) => {
  try {
    const payload = productPayload(req.body);
    const validationError = validateProduct(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const existing = await Product.findOne({ _id: req.params.id, owner: req.userId, active: true });
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, active: true },
      payload,
      { returnDocument: "after", runValidators: true },
    );
    if (existing.imagePublicId && existing.imagePublicId !== product.imagePublicId) await destroyImage(existing.imagePublicId);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.code === 11000 ? "Barcode already exists" : error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId, active: true },
    { active: false },
    { returnDocument: "after" },
  );
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  await destroyImage(product.imagePublicId);
  res.json({ success: true, message: "Product deleted" });
};
