const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const DeviceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    unique: true,
    index: true,
  },
  sessionIdHash: { type: String, required: true, index: true },
  deviceIdHash: { type: String, required: true, index: true },
  deviceName: { type: String, default: "Mobile device", trim: true, maxlength: 120 },
  platform: { type: String, default: "unknown", trim: true, maxlength: 30 },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = authConnection.model(
  "DeviceSession",
  DeviceSessionSchema,
  "billing_device_sessions",
);
