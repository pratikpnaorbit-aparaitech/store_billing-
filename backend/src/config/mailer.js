const nodemailer = require("nodemailer");

let transporter;

function senderDetails() {
  const configured = String(process.env.EMAIL_FROM || "").trim();
  const match = configured.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim() || "Smart Billing", email: match[2].trim() }
    : { name: "Smart Billing", email: configured };
}

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendCodeEmail(email, code, purpose) {
  if (!process.env.EMAIL_FROM) throw new Error("Password reset email is not configured");
  const isRegistration = purpose === "registration";
  const subject = isRegistration ? "Verify your Smart Billing account" : "Smart Billing password reset code";
  const label = isRegistration ? "account verification" : "password reset";
  const text = `Your Smart Billing ${label} code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`;
  const html = `<h2>Smart Billing</h2><p>Your ${label} code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 15 minutes. If you did not request it, ignore this email.</p>`;

  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sender: senderDetails(), to: [{ email }], subject, htmlContent: html }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || "Password reset email provider rejected the request");
    }
    return;
  }

  const mailer = getTransporter();
  if (!mailer) throw new Error("Password reset email is not configured");
  await mailer.sendMail({ from: process.env.EMAIL_FROM, to: email, subject, text, html });
}

exports.sendPasswordResetCode = (email, code) => sendCodeEmail(email, code, "password reset");
exports.sendRegistrationCode = (email, code) => sendCodeEmail(email, code, "registration");

exports.sendLowStockAlert = async (email, products = []) => {
  if (!email || !products.length || !process.env.EMAIL_FROM) return false;
  const rows = products
    .map((product) => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${String(product.name)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right"><strong>${Number(product.stock)}</strong></td></tr>`)
    .join("");
  const subject = `Low stock alert: ${products.length} product${products.length === 1 ? "" : "s"} need refill`;
  const html = `<h2>Smart Billing low-stock alert</h2><p>A bill was completed and these products are now low in stock. Please refill them.</p><table style="border-collapse:collapse;width:100%"><thead><tr><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:right">Stock left</th></tr></thead><tbody>${rows}</tbody></table>`;
  const text = `Low stock after billing:\n${products.map((product) => `${product.name}: ${product.stock} left`).join("\n")}`;

  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ sender: senderDetails(), to: [{ email }], subject, htmlContent: html }),
    });
    if (!response.ok) throw new Error("Low-stock email provider rejected the request");
    return true;
  }
  const mailer = getTransporter();
  if (!mailer) return false;
  await mailer.sendMail({ from: process.env.EMAIL_FROM, to: email, subject, text, html });
  return true;
};
