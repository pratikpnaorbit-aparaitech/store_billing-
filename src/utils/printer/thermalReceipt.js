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
}) {
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
Scan • Bill • Print
${line}
Invoice: ${invoiceNo}
Date: ${date}
Customer: ${customer?.name || "Walk-in Customer"}
Payment: ${payment}
${line}
ITEM          QTY  RATE   TOTAL
${line}
${items}
${line}
Subtotal: ₹${money(subtotal)}
GST ${gstRate}%: ₹${money(gst)}
Discount: ₹${money(discount)}
${line}
TOTAL: ₹${money(total)}
${line}
Thank You!
`;
}
