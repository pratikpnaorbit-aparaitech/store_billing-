const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const CheckoutSessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
  razorpaySubscriptionId: { type: String, required: true, index: true },
  status: { type: String, enum: ["pending", "verified"], default: "pending" },
  paymentId: { type: String, default: "" },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = authConnection.model(
  "CheckoutSession",
  CheckoutSessionSchema,
  "billing_checkout_sessions",
);
