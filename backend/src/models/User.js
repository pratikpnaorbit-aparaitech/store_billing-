const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  storeName: { type: String, trim: true, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: "" },
  password: { type: String, required: true, select: false },
  role: { type: String, default: "user" },
  passwordResetHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
}, { timestamps: true });

module.exports = authConnection.model("User", UserSchema, "users");
