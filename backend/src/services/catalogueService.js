let catalogueDocument = { metadata: {}, products: [] };
let catalogueLoadError = "";
try {
  // Keep this as a static require so deployment builders include the catalogue
  // in the server artifact instead of treating it as an optional runtime file.
  catalogueDocument = require("../../data/catalogue.json");
} catch (error) {
  catalogueLoadError = error.message;
  console.warn("Shared product catalogue is unavailable:", error.message);
}

const catalogueProducts = Array.isArray(catalogueDocument.products)
  ? catalogueDocument.products
  : [];
const catalogueByBarcode = new Map(
  catalogueProducts.map((product) => [String(product.barcode), product]),
);

function virtualProduct(product) {
  return {
    _id: `catalog:${product.barcode}`,
    id: `catalog:${product.barcode}`,
    name: product.name,
    brand: product.brand || "",
    barcode: product.barcode,
    category: product.category || "Grocery",
    price: Number(product.price || 0),
    stock: 0,
    unit: product.unit || "1 pc",
    image: product.image || "",
    imagePublicId: "",
    active: true,
    source: "catalogue",
    catalogue: true,
    virtual: true,
    priceSource: product.priceSource || "unset",
    priceDate: product.priceDate || null,
    createdAt: null,
    updatedAt: null,
  };
}

function catalogueProduct(barcode) {
  return catalogueByBarcode.get(String(barcode || "").trim()) || null;
}

function mergedProducts(userProducts) {
  const overrideByBarcode = new Map(
    userProducts.map((product) => [String(product.barcode), product]),
  );
  const merged = [];
  for (const catalogueEntry of catalogueProducts) {
    const override = overrideByBarcode.get(String(catalogueEntry.barcode));
    if (override) {
      overrideByBarcode.delete(String(catalogueEntry.barcode));
      if (override.active) {
        const value = override.toObject ? override.toObject() : override;
        merged.push({ ...value, catalogue: true, virtual: false });
      }
    } else {
      merged.push(virtualProduct(catalogueEntry));
    }
  }
  for (const product of overrideByBarcode.values()) {
    if (!product.active) continue;
    const value = product.toObject ? product.toObject() : product;
    merged.push({ ...value, catalogue: value.source === "catalogue", virtual: false });
  }
  return merged.sort((left, right) => (
    Number(right.stock || 0) - Number(left.stock || 0)
    || String(left.name).localeCompare(String(right.name), "en")
  ));
}

module.exports = {
  catalogueLoadError,
  catalogueMetadata: catalogueDocument.metadata || {},
  catalogueProduct,
  catalogueProducts,
  mergedProducts,
  virtualProduct,
};
