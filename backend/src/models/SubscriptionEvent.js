const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const SubscriptionEventSchema = new mongoose.Schema({
  dedupeKey: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  type: { type: String, required: true, trim: true, index: true },
  razorpaySubscriptionId: { type: String, default: "", index: true },
  paymentId: { type: String, default: "" },
  status: { type: String, default: "" },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
}, { timestamps: true });

module.exports = authConnection.model(
  "SubscriptionEvent",
  SubscriptionEventSchema,
  "billing_subscription_events",
);
