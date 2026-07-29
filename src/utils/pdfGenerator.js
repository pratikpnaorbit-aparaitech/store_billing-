import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatCurrency } from "./billing";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;",
}[char]));

export async function generateAndShareReceiptPDF(data) {
  const html = buildReceiptHtml(data);
  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (!win) throw new Error(data.labels?.allowPopups || "Allow pop-ups to print the receipt.");
    win.document.write(html);
    win.document.close();
    win.print();
    return null;
  }
  const result = await Print.printToFileAsync({ html });
  if (!result?.uri) throw new Error("PDF generation failed");
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `${data.labels?.receipt || "Receipt"} ${data.invoiceNo}`,
    });
  } else {
    await Print.printAsync({ uri: result.uri });
  }
  return result.uri;
}

export function buildReceiptHtml({
  cart = [],
  payment,
  subtotal,
  gstRate = 5,
  gst,
  discount,
  total,
  invoiceNo,
  date,
  customer,
  storeName = "My Store",
  labels = {},
}) {
  const label = (key, fallback) => labels[key] || fallback;
  const rows = cart.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span>${Number(item.quantity)} × ${formatCurrency(item.price)}</span>
      </td>
      <td style="text-align:right">${formatCurrency(Number(item.price) * Number(item.quantity))}</td>
    </tr>
  `).join("");
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
        h1,p{text-align:center}
        table{width:100%;border-collapse:collapse}
        td{padding:10px 0;border-bottom:1px solid #e2e8f0}
        .meta p,.summary p{text-align:left;margin:8px 0}
        .summary strong{float:right}
      </style>
    </head>
    <body>
      <h1>${escapeHtml(storeName)}</h1>
      <p>${escapeHtml(label("tagline", "Scan • Bill • Print"))}</p>
      <hr>
      <div class="meta">
        <p><b>${escapeHtml(label("invoice", "Invoice"))}:</b> ${escapeHtml(invoiceNo)}</p>
        <p><b>${escapeHtml(label("date", "Date"))}:</b> ${escapeHtml(date)}</p>
        <p><b>${escapeHtml(label("customer", "Customer"))}:</b> ${escapeHtml(customer?.name || label("walkInCustomer", "Walk-in Customer"))}</p>
        <p><b>${escapeHtml(label("payment", "Payment"))}:</b> ${escapeHtml(payment)}</p>
      </div>
      <table>${rows}</table>
      <div class="summary">
        <p>${escapeHtml(label("subtotal", "Subtotal"))} <strong>${formatCurrency(subtotal)}</strong></p>
        <p>GST ${Number(gstRate)}% <strong>${formatCurrency(gst)}</strong></p>
        <p>${escapeHtml(label("discount", "Discount"))} <strong>${formatCurrency(discount)}</strong></p>
        <h2 style="text-align:right">${escapeHtml(label("total", "TOTAL"))}: ${formatCurrency(total)}</h2>
      </div>
      <p>${escapeHtml(label("thankYou", "Thank you"))} ❤️</p>
    </body>
  </html>`;
}
