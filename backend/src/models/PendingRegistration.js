const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const PendingRegistrationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  storeName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = authConnection.model(
  "PendingRegistration",
  PendingRegistrationSchema,
  "billing_registration_otps",
);
