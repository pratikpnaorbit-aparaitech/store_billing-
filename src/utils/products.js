export function createManualBarcode(now = Date.now(), random = Math.random()) {
  const entropy = Math.floor(Math.max(0, Math.min(0.999999, Number(random) || 0)) * 2176782336)
    .toString(36)
    .padStart(6, "0");
  return `manual-${now}-${entropy}`;
}

export function isManualBarcode(barcode) {
  return String(barcode || "").startsWith("manual-");
}
