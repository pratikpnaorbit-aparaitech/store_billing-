const nodemailer = require("nodemailer");

let transporter;

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

exports.sendPasswordResetCode = async (email, code) => {
  const mailer = getTransporter();
  if (!mailer || !process.env.EMAIL_FROM) throw new Error("Password reset email is not configured");
  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Smart Billing password reset code",
    text: `Your Smart Billing password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
    html: `<h2>Smart Billing</h2><p>Your password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 15 minutes. If you did not request it, ignore this email.</p>`,
  });
};
