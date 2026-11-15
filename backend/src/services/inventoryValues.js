const DIGITS = "०१२३४५६७८९";
const asciiDigits = (value) => String(value ?? "").replace(/[०-९]/g, (digit) => String(DIGITS.indexOf(digit)));
function numericValue(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = asciiDigits(value).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}
const rounded = (value) => Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
function measurement(value) {
  const text = asciiDigits(value).toLowerCase().replace(/\s+/g, " ");
  const match = text.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)?\s*(kilograms?|kgs?|किलो|किलोग्राम|grams?|gms?|gm|g|ग्रॅम|ग्राम|litres?|liters?|ltrs?|ltr|lit|l|लीटर|लिटर|millilitres?|milliliters?|ml|मिलीलीटर|मिलिलिटर)(?![a-z\p{L}])/u);
  if (!match) return null;
  const amount = Number(match[1] || 1);
  const unit = match[2];
  const weight = /^(?:k|g|क|ग्र)/.test(unit);
  const small = /^(?:g|ग्र|m|मि)/.test(unit);
  return { dimension: weight ? "weight" : "volume", amount: rounded(amount * (small ? 0.001 : 1)), unit: weight ? "1 kg" : "1 L" };
}
function normalizeInventoryRow(row) {
  const name = String(row.name || "").replace(/\s+/g, " ").trim();
  let quantity = numericValue(row.quantity);
  if (!name || !quantity || quantity > 1000000) return null;
  const suppliedUnit = String(row.quantityUnit || row.unit || "pcs").trim();
  const measure = measurement(suppliedUnit);
  let unit = String(row.unit || "1 pc").trim();
  if (measure) { quantity = rounded(quantity * measure.amount); unit = measure.unit; }
  const lineTotal = numericValue(row.lineTotal);
  let price = numericValue(row.price);
  let priceSource = price === null ? "missing" : "bill-rate";
  if (price === null && lineTotal !== null) { price = Math.round(lineTotal / quantity * 100) / 100; priceSource = "bill-total"; }
  let warning = String(row.warning || "");
  if (price !== null && lineTotal !== null && Math.abs(quantity * price - lineTotal) > Math.max(0.05, lineTotal * 0.01)) {
    warning = [warning, "Quantity × rate differs from the row amount; check units, discounts and rate."].filter(Boolean).join(" ");
  }
  return { ...row, name, quantity, unit, quantityUnit: measure ? (measure.dimension === "weight" ? "kg" : "L") : "pcs", price, lineTotal, priceSource, warning };
}
function alignInventoryRow(row, product) {
  const source = measurement(row.unit);
  const target = measurement(product.unit) || measurement(product.name);
  if (row.quantityUnit === "pcs" || !source || !target || source.dimension !== target.dimension) return { ...row, unit: product.unit || row.unit };
  const ratio = source.amount / target.amount;
  return { ...row, quantity: rounded(row.quantity * ratio), price: row.price === null ? null : Math.round(row.price / ratio * 100) / 100, unit: product.unit || row.unit, quantityUnit: "pcs" };
}
module.exports = { asciiDigits, numericValue, rounded, measurement, normalizeInventoryRow, alignInventoryRow };
