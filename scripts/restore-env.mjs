import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value.replace(/\\n/g, "\n");
  }
  return values;
}

function requireValue(values, key) {
  const value = String(values[key] || "").trim();
  if (!value) throw new Error(`Source environment is missing ${key}`);
  return value;
}

function mongoUriForDatabase(uri, databaseName) {
  const parsed = new URL(uri);
  if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol)) {
    throw new Error("MONGO_URI must use mongodb:// or mongodb+srv://");
  }
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function quote(value) {
  return JSON.stringify(String(value ?? ""));
}

function render(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${quote(value)}`)
    .join("\n")}\n`;
}

const [sourcePath, publicApiUrl = "http://127.0.0.1:5001"] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error("Usage: npm run env:restore -- /absolute/path/to/source/.env [public-api-url]");
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = parseEnv(fs.readFileSync(path.resolve(sourcePath), "utf8"));
const sourceMongoUri = requireValue(source, "MONGO_URI");
const sourceDatabase = requireValue(source, "MONGO_DB_NAME");
const emailAddress = requireValue(source, "MAIL_FROM_EMAIL");
const emailName = String(source.MAIL_FROM_NAME || "Smart Billing").trim();

const backendValues = {
  PORT: "5001",
  NODE_ENV: "development",
  MONGODB_URI: mongoUriForDatabase(sourceMongoUri, "smart_billing"),
  AUTH_MONGODB_URI: mongoUriForDatabase(sourceMongoUri, sourceDatabase),
  MONGO_DNS_SERVERS: source.MONGO_DNS_SERVERS || "",
  JWT_SECRET: requireValue(source, "JWT_SECRET"),
  CORS_ORIGINS: "*",
  CLOUDINARY_CLOUD_NAME: source.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: source.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: source.CLOUDINARY_API_SECRET || "",
  BREVO_API_KEY: source.BREVO_API_KEY || "",
  SMTP_HOST: source.BREVO_SMTP_HOST || "",
  SMTP_PORT: source.BREVO_SMTP_PORT || "587",
  SMTP_SECURE: String(source.BREVO_SMTP_PORT || "") === "465" ? "true" : "false",
  SMTP_USER: source.BREVO_SMTP_USER || "",
  SMTP_PASS: source.BREVO_SMTP_KEY || "",
  EMAIL_FROM: `${emailName} <${emailAddress}>`,
};

const rootEnvPath = path.join(projectRoot, ".env");
const backendEnvPath = path.join(projectRoot, "backend", ".env");
fs.writeFileSync(rootEnvPath, render({ EXPO_PUBLIC_API_URL: publicApiUrl }), { mode: 0o600 });
fs.writeFileSync(backendEnvPath, render(backendValues), { mode: 0o600 });
fs.chmodSync(rootEnvPath, 0o600);
fs.chmodSync(backendEnvPath, 0o600);

console.log("Restored ignored environment files:");
console.log(`- ${rootEnvPath}`);
console.log(`- ${backendEnvPath}`);
console.log("No credential values were printed.");
