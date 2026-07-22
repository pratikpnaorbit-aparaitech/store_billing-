const assert = require("node:assert/strict");
const test = require("node:test");
const validateEnv = require("../src/config/validateEnv");

const productionEnv = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://cluster.example/smart-billing",
  JWT_SECRET: "a-secure-secret-that-is-over-32-characters",
  CORS_ORIGINS: "https://billing.example.com",
  CLOUDINARY_CLOUD_NAME: "company",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "user",
  SMTP_PASS: "pass",
  BREVO_API_KEY: "brevo-key",
  EMAIL_FROM: "billing@example.com",
};

test("accepts a complete production environment", () => {
  assert.doesNotThrow(() => validateEnv(productionEnv));
});

test("rejects wildcard CORS and localhost databases in production", () => {
  assert.throws(() => validateEnv({ ...productionEnv, CORS_ORIGINS: "*" }), /cannot contain/);
  assert.throws(() => validateEnv({ ...productionEnv, MONGODB_URI: "mongodb:\/\/127.0.0.1/store" }), /localhost/);
});

test("requires every production integration", () => {
  assert.throws(() => validateEnv({ ...productionEnv, BREVO_API_KEY: "", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "" }), /BREVO_API_KEY/);
});
