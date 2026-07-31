function normalizeUpiId(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function isValidUpiId(value) {
  return /^[a-z0-9._-]{2,128}@[a-z0-9.-]{2,64}$/.test(normalizeUpiId(value));
}

module.exports = { normalizeUpiId, isValidUpiId };
