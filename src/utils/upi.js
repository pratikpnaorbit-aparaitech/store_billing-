export function normalizeUpiId(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

export function isValidUpiId(value) {
  const normalized = normalizeUpiId(value);
  return /^[a-z0-9._-]{2,128}@[a-z0-9.-]{2,64}$/.test(normalized);
}

function encodedPair(key, value) {
  return `${key}=${encodeURIComponent(String(value))}`;
}

export function buildUpiPaymentUri({ upiId, payeeName, amount, transactionRef }) {
  const normalizedUpiId = normalizeUpiId(upiId);
  const numericAmount = Number(amount);
  if (!isValidUpiId(normalizedUpiId)) throw new Error("A valid UPI ID is required");
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("A positive payment amount is required");

  const merchantName = String(payeeName || "Store").trim().slice(0, 80) || "Store";
  const reference = String(transactionRef || `BILL${Date.now()}`)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 35);
  const note = `Bill ${String(transactionRef || reference).trim()}`.slice(0, 80);
  const pairs = [
    ["pa", normalizedUpiId],
    ["pn", merchantName],
    ["tr", reference],
    ["tn", note],
    ["am", numericAmount.toFixed(2)],
    ["cu", "INR"],
  ];

  return `upi://pay?${pairs.map(([key, value]) => encodedPair(key, value)).join("&")}`;
}
