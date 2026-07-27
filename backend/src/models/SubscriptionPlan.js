const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const SubscriptionPlanSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  durationMonths: { type: Number, required: true, enum: [1, 3, 6], index: true },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, default: "INR", enum: ["INR"] },
  version: { type: Number, required: true, min: 1 },
  active: { type: Boolean, default: false, index: true },
  razorpayPlanIds: {
    live: { type: String, default: "" },
    test: { type: String, default: "" },
  },
  createdBy: { type: String, default: "system", trim: true },
}, { timestamps: true });

SubscriptionPlanSchema.index({ durationMonths: 1, version: -1 });

module.exports = authConnection.model(
  "SubscriptionPlan",
  SubscriptionPlanSchema,
  "billing_subscription_plans",
);
