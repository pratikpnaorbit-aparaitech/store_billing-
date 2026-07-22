const REQUIRED_PRODUCTION_KEYS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CORS_ORIGINS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
];

function validateEnv(env = process.env) {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  if (env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_KEYS.filter((key) => !String(env[key] || "").trim());
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  if (env.CORS_ORIGINS.split(",").map((value) => value.trim()).includes("*")) {
    throw new Error("CORS_ORIGINS cannot contain * in production");
  }
  if (/localhost|127\.0\.0\.1/i.test(env.MONGODB_URI)) {
    throw new Error("Production MONGODB_URI cannot point to localhost");
  }
}

module.exports = validateEnv;
