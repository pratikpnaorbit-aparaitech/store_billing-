const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const SubscriptionSchema = new mongoose.Schema({
  status: { type: String, default: "trialing", trim: true },
  trialStartedAt: { type: Date, default: null },
  trialEndsAt: { type: Date, default: null },
  planId: { type: String, default: "" },
  razorpaySubscriptionId: { type: String, default: "", index: true },
  currentPeriodStart: { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null },
  nextChargeAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  lastPaymentId: { type: String, default: "" },
  lastPaymentAt: { type: Date, default: null },
  lastEvent: { type: String, default: "" },
  lastSyncedAt: { type: Date, default: null },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  storeName: { type: String, trim: true, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: "" },
  password: { type: String, required: true, select: false },
  role: { type: String, default: "user" },
  subscription: { type: SubscriptionSchema, default: () => ({}) },
  passwordResetHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
}, { timestamps: true });

module.exports = authConnection.model("User", UserSchema, "users");
