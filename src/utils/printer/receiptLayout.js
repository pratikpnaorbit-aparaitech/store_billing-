const clean = (value) => String(value ?? "").replace(/[\x00-\x1f\x7f]/g, " ").trim();
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export function thermalReceiptText(data, paperWidth = 58) {
  const columns = Number(paperWidth) === 80 ? 48 : 32;
  const line = "-".repeat(columns);
  const wrap = (value) => {
    const text = clean(value);
    const rows = [];
    for (let i = 0; i < text.length; i += columns) rows.push(text.slice(i, i + columns));
    return rows.length ? rows : [""];
  };
  const money = (value) => Number(value || 0).toFixed(2);
  const pair = (label, value) => wrap(clean(label) + ": " + clean(value));
  const rows = [
    ...wrap(data.storeName || "My Store"),
    ...(data.gstNo ? pair("GSTIN", data.gstNo) : []), line,
    ...pair("Invoice", data.invoiceNo), ...pair("Date", data.date),
    ...pair("Customer", data.customer?.name || "Walk-in Customer"),
    ...pair("Payment", data.payment || "Cash"), line,
  ];
  for (const item of data.cart || data.items || []) {
    rows.push(...wrap(item.name));
    rows.push(...wrap(clean(item.quantity) + " x " + money(item.price) + " = Rs " + money(Number(item.price) * Number(item.quantity))));
  }
  rows.push(line, ...pair("Subtotal Rs", money(data.subtotal)), ...pair("GST " + Number(data.gstRate || 0) + "% Rs", money(data.gst)), ...pair("Discount Rs", money(data.discount)), line, ...pair("TOTAL Rs", money(data.total)), line, "Thank you!", "");
  return rows.join("\n");
}

export function thermalReceiptHtml(data, paperWidth = 58) {
  const width = Number(paperWidth) === 80 ? 80 : 58;
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:' + width + 'mm auto;margin:0}body{margin:0;padding:3mm;width:' + (width - 6) + 'mm;color:#000;background:#fff;box-sizing:content-box}pre{font:' + (width === 80 ? 9.5 : 10) + 'px/1.4 monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}</style></head><body><pre>' + escapeHtml(thermalReceiptText(data, width)) + '</pre></body></html>';
}

export function thermalReceiptPayload(data, paperWidth = 58) {
  // Escape the native ESC/POS formatter's markup in user-supplied text.
  return thermalReceiptText(data, paperWidth).replace(/[<>\[\]]/g, (char) => ({ "<": "(", ">": ")", "[": "(", "]": ")" }[char])).split("\n").map((line) => "[L]" + line).join("\n") + "\n";
}
