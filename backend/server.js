const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const connectDB = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const authRoutes = require("./src/routes/authRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const inventoryImportRoutes = require("./src/routes/inventoryImportRoutes");
const subscriptionController = require("./src/controllers/subscriptionController");
const mongoose = require("mongoose");
const validateEnv = require("./src/config/validateEnv");
const { authConnection, connectAuthDB } = require("./src/config/authDb");
const {
  catalogueLoadError,
  catalogueProducts,
} = require("./src/services/catalogueService");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "*").split(",").map((value) => value.trim());
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins.includes("*") ? true : allowedOrigins }));
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  subscriptionController.webhook,
);
app.use(express.json({ limit: "8mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
app.use("/api/auth", authLimiter);
app.use("/api/admin/login", adminLimiter);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/inventory-import", inventoryImportRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    authDatabase: authConnection.readyState === 1 ? "connected" : "disconnected",
    catalogue: {
      status: catalogueLoadError ? "unavailable" : "ready",
      count: catalogueProducts.length,
    },
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Billing Backend Running",
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

async function start() {
  validateEnv();
  await Promise.all([connectDB(), connectAuthDB()]);
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  const shutdown = () => server.close(async () => {
    await Promise.all([mongoose.disconnect(), authConnection.close()]);
    process.exit(0);
  });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (require.main === module) start().catch((error) => { console.error(error); process.exit(1); });

module.exports = { app, start };
