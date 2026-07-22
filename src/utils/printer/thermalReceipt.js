export function buildThermalReceipt({ cart = [], invoiceNo = "", date = "", payment = "Cash", subtotal = 0, gstRate = 5, gst = 0, discount = 0, total = 0, customer }) {
  const line = "--------------------------------";
  const money = (value) => Number(value || 0).toFixed(2);
  const items = cart.map((item) => {
    const name = String(item.name || "").slice(0, 13).padEnd(13, " ");
    const qty = String(item.quantity || 1).padStart(2, " ");
    const price = money(item.price).padStart(6, " ");
    const amount = money(Number(item.price || 0) * Number(item.quantity || 1)).padStart(7, " ");
    return `${name} ${qty} ${price} ${amount}`;
  }).join("\n");
  return `SMART BILLING\nScan • Bill • Print\n${line}\nInvoice: ${invoiceNo}\nDate: ${date}\nCustomer: ${customer?.name || 'Walk-in Customer'}\nPayment: ${payment}\n${line}\nITEM          QTY  RATE   TOTAL\n${line}\n${items}\n${line}\nSubtotal: ₹${money(subtotal)}\nGST ${gstRate}%: ₹${money(gst)}\nDiscount: ₹${money(discount)}\n${line}\nTOTAL: ₹${money(total)}\n${line}\nThank You!\n`;
}
