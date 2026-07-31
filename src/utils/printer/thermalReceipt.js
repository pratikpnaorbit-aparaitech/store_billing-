export function buildThermalReceipt({
  cart = [],
  invoiceNo = "",
  date = "",
  payment = "Cash",
  subtotal = 0,
  gstRate = 5,
  gst = 0,
  discount = 0,
  total = 0,
  customer,
  storeName = "My Store",
  gstNo = "",
  labels = {},
}) {
  const label = (key, fallback) => labels[key] || fallback;
  const line = "--------------------------------";
  const money = (value) => Number(value || 0).toFixed(2);
  const items = cart.map((item) => {
    const name = String(item.name || "").slice(0, 13).padEnd(13, " ");
    const qty = String(item.quantity || 1).padStart(2, " ");
    const price = money(item.price).padStart(6, " ");
    const amount = money(Number(item.price || 0) * Number(item.quantity || 1)).padStart(7, " ");
    return `${name} ${qty} ${price} ${amount}`;
  }).join("\n");
  return `${String(storeName).toUpperCase()}
${label("tagline", "Scan • Bill • Print")}
${gstNo ? `GSTIN: ${gstNo}\n` : ""}${line}
${label("invoice", "Invoice")}: ${invoiceNo}
${label("date", "Date")}: ${date}
${label("customer", "Customer")}: ${customer?.name || label("walkInCustomer", "Walk-in Customer")}
${label("payment", "Payment")}: ${payment}
${line}
${label("item", "ITEM")}          ${label("qty", "QTY")}  ${label("rate", "RATE")}   ${label("total", "TOTAL")}
${line}
${items}
${line}
${label("subtotal", "Subtotal")}: ₹${money(subtotal)}
GST ${gstRate}%: ₹${money(gst)}
${label("discount", "Discount")}: ₹${money(discount)}
${line}
${label("total", "TOTAL")}: ₹${money(total)}
${line}
${label("thankYou", "Thank You")}!
`;
}
