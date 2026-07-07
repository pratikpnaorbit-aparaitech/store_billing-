require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    database: "connected",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Billing Backend Running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
