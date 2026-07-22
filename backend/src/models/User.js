const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  storeName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  passwordResetHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
