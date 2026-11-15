import values from "../../backend/src/services/inventoryValues.js";
const { alignInventoryRow, asciiDigits, rounded } = values;
export { asciiDigits };
export function inventoryReviewRow(candidate) {
  const billPrice = candidate.price === null || candidate.price === undefined ? null : Number(candidate.price);
  return { ...candidate, productId: candidate.product?.id || "", productName: candidate.product?.name || candidate.name,
    productBarcode: candidate.product?.barcode || candidate.barcode || "", quantity: String(candidate.quantity ?? 1),
    price: billPrice === null ? (candidate.product ? String(candidate.product.price) : "") : String(billPrice),
    billPrice, updatePrice: billPrice !== null, category: candidate.product?.category || "Grocery",
    unit: candidate.product?.unit || candidate.unit || "1 pc", currentStock: Number(candidate.product?.stock || 0),
  };
}
export function selectInventoryProduct(row, product) {
  const source = { ...row, ...(row.original || {}), warning: "" };
  const aligned = alignInventoryRow(source, product);
  return { ...row, include: true, matched: true, matchScore: 1, product, productId: product.id || product._id,
    productName: product.name, productBarcode: product.barcode, currentStock: Number(product.stock || 0),
    quantity: String(aligned.quantity), price: aligned.price === null ? String(product.price || 0) : String(aligned.price),
    billPrice: aligned.price, updatePrice: aligned.price !== null, category: product.category || "Grocery", unit: product.unit || aligned.unit, warning: "",
  };
}
export function createInventoryProduct(row) {
  const original = row.original || row;
  return { ...row, include: true, matched: false, product: null, productId: "", productName: row.name,
    productBarcode: row.barcode || "", currentStock: 0, quantity: String(original.quantity),
    price: original.price === null || original.price === undefined ? "" : String(original.price),
    billPrice: original.price, updatePrice: original.price !== null && original.price !== undefined, unit: original.unit || "1 pc", warning: "",
  };
}
export function inventoryStockAfter(row) { return rounded(Number(row.currentStock || 0) + Number(row.quantity || 0)); }
