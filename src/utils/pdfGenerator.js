import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export async function generateAndShareReceiptPDF(data) {
  const { html } = buildReceiptHtml(data);

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
    return null;
  }

  const result = await Print.printToFileAsync({ html });

  if (!result?.uri) {
    throw new Error("PDF generation failed");
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }

  return result.uri;
}

function buildReceiptHtml({
  cart,
  payment,
  subtotal,
  gst,
  discount,
  total,
  invoiceNo,
  date,
}) {
  const rows = cart
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${item.name}</strong><br/>
            <span>${item.quantity} × ₹${item.price}</span>
          </td>
          <td style="text-align:right;">₹${Number(item.price) * item.quantity}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
      <body style="font-family: Arial; padding: 24px; color: #0F172A;">
        <h1 style="text-align:center;">SMART BILLING</h1>
        <p style="text-align:center;">Scan • Bill • Print</p>
        <hr/>
        <p><strong>Invoice:</strong> ${invoiceNo}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Payment:</strong> ${payment}</p>
        <hr/>
        <table style="width:100%; border-collapse:collapse;">${rows}</table>
        <hr/>
        <p><strong>Subtotal:</strong> ₹${subtotal}</p>
        <p><strong>GST 5%:</strong> ₹${gst}</p>
        <p><strong>Discount:</strong> ₹${discount}</p>
        <h2 style="text-align:right;">TOTAL: ₹${total}</h2>
        <p style="text-align:center; margin-top: 32px;">Thank you ❤️</p>
      </body>
    </html>
  `;

  return { html };
}
