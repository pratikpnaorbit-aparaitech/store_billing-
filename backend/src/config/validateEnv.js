const REQUIRED_PRODUCTION_KEYS = [
  "MONGODB_URI",
  "AUTH_MONGODB_URI",
  "JWT_SECRET",
  "CORS_ORIGINS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "EMAIL_FROM",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

function validateEnv(env = process.env) {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!env.AUTH_MONGODB_URI) throw new Error("AUTH_MONGODB_URI is required");
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  if (env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_KEYS.filter((key) => !String(env[key] || "").trim());
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  const hasBrevoApi = Boolean(String(env.BREVO_API_KEY || "").trim());
  const hasSmtp = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].every((key) => String(env[key] || "").trim());
  if (!hasBrevoApi && !hasSmtp) throw new Error("Configure BREVO_API_KEY or complete SMTP credentials");
  if (env.CORS_ORIGINS.split(",").map((value) => value.trim()).includes("*")) {
    throw new Error("CORS_ORIGINS cannot contain * in production");
  }
  if (/localhost|127\.0\.0\.1/i.test(env.MONGODB_URI)) {
    throw new Error("Production MONGODB_URI cannot point to localhost");
  }
  if (/localhost|127\.0\.0\.1/i.test(env.AUTH_MONGODB_URI)) {
    throw new Error("Production AUTH_MONGODB_URI cannot point to localhost");
  }
}

module.exports = validateEnv;
