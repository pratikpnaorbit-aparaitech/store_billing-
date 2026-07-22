const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetCode } = require("../config/mailer");

const publicUser = (user) => ({ id: user._id, name: user.name, storeName: user.storeName, email: user.email });
const tokenFor = (user) => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d", issuer: "smart-billing-api" });

exports.register = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const storeName = String(req.body.storeName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !storeName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return res.status(400).json({ success: false, message: "Name, store, valid email and an 8 character password are required" });
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must have at least 32 characters");
    const user = await User.create({ name, storeName, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ success: true, data: { user: publicUser(user), token: tokenFor(user) } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.code === 11000 ? "Email already registered" : error.message });
  }
};

exports.login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("Server authentication is not configured");
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    res.json({ success: true, data: { user: publicUser(user), token: tokenFor(user) } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, data: publicUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const storeName = String(req.body.storeName || "").trim();
  if (!name || !storeName) return res.status(400).json({ success: false, message: "Name and store name are required" });
  const user = await User.findByIdAndUpdate(req.userId, { name, storeName }, { new: true, runValidators: true });
  res.json({ success: true, data: publicUser(user) });
};

exports.changePassword = async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must have at least 8 characters" });
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ success: false, message: "Current password is incorrect" });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ success: true });
};

exports.requestPasswordReset = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email" });
  const user = await User.findOne({ email }).select("+passwordResetHash +passwordResetExpires");
  if (!user) return res.json({ success: true, message: "If the account exists, a reset code was sent" });
  try {
    const code = String(crypto.randomInt(100000, 1000000));
    user.passwordResetHash = crypto.createHash("sha256").update(code).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await sendPasswordResetCode(user.email, code);
    res.json({ success: true, message: "If the account exists, a reset code was sent" });
  } catch (error) {
    user.passwordResetHash = null;
    user.passwordResetExpires = null;
    await user.save();
    res.status(503).json({ success: false, message: error.message });
  }
};

exports.resetPasswordWithCode = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const codeHash = crypto.createHash("sha256").update(String(req.body.code || "")).digest("hex");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must have at least 8 characters" });
  const user = await User.findOne({ email, passwordResetHash: codeHash, passwordResetExpires: { $gt: new Date() } }).select("+passwordHash +passwordResetHash +passwordResetExpires");
  if (!user) return res.status(400).json({ success: false, message: "Reset code is invalid or expired" });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetHash = null;
  user.passwordResetExpires = null;
  await user.save();
  res.json({ success: true });
};
