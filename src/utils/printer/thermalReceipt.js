export function buildThermalReceipt({
  cart = [],
  invoiceNo = "",
  date = "",
  payment = "Cash",
  subtotal = 0,
  gst = 0,
  discount = 0,
  total = 0,
}) {
  const line = "--------------------------------";

  const items = cart
    .map((item) => {
      const name = String(item.name || "").slice(0, 14).padEnd(14, " ");
      const qty = String(item.quantity || 1).padStart(2, " ");
      const price = String(item.price || 0).padStart(4, " ");
      const amount = String(Number(item.price || 0) * Number(item.quantity || 1)).padStart(5, " ");
      return `${name} ${qty}x${price} ${amount}`;
    })
    .join("\n");

  return `
        SMART BILLING
      Scan • Bill • Print
${line}
Invoice: ${invoiceNo}
Date   : ${date}
Payment: ${payment}
${line}
ITEM           QTY RATE TOTAL
${line}
${items}
${line}
Subtotal          ₹${subtotal}
GST 5%            ₹${gst}
Discount          ₹${discount}
${line}
TOTAL             ₹${total}
${line}
        Thank You!
${line}

`;
}
