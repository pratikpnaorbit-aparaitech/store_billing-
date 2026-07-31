const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const SubscriptionSchema = new mongoose.Schema({
  status: { type: String, default: "trialing", trim: true },
  trialStartedAt: { type: Date, default: null },
  trialEndsAt: { type: Date, default: null },
  catalogPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null },
  planVersion: { type: Number, default: null },
  planName: { type: String, default: "" },
  planDurationMonths: { type: Number, default: null },
  planAmountPaise: { type: Number, default: null },
  planCurrency: { type: String, default: "INR" },
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
  migrationPending: { type: Boolean, default: false },
  migrationTargetCatalogPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null },
  migrationStartedAt: { type: Date, default: null },
  migrationStartsAt: { type: Date, default: null },
  migrationCompletedAt: { type: Date, default: null },
  previousRazorpaySubscriptionId: { type: String, default: "", index: true },
}, { _id: false });

const AccountAccessSchema = new mongoose.Schema({
  paused: { type: Boolean, default: false },
  pausedAt: { type: Date, default: null },
  pausedBy: { type: String, default: "" },
  pauseReason: { type: String, default: "" },
  providerPaused: { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  storeName: { type: String, trim: true, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: "" },
  gstNo: { type: String, trim: true, uppercase: true, default: "" },
  avatarUrl: { type: String, trim: true, default: "" },
  password: { type: String, required: true, select: false },
  role: { type: String, default: "user" },
  subscription: { type: SubscriptionSchema, default: () => ({}) },
  accountAccess: { type: AccountAccessSchema, default: () => ({}) },
  passwordResetHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
}, { timestamps: true });

module.exports = authConnection.model("User", UserSchema, "users");
