const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const DeviceSession = require("../models/DeviceSession");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const { sendPasswordResetCode, sendRegistrationCode } = require("../config/mailer");
const {
  establishDeviceSession,
  hashValue,
  normalizeDevice,
  revokeUserSessions,
} = require("../services/deviceSessionService");
const { ensureTrial, subscriptionView, trialDays } = require("../services/subscriptionService");
const { isValidUpiId, normalizeUpiId } = require("../utils/upi");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  storeName: user.storeName || user.name || "My Store",
  email: user.email,
  phone: user.phone || "",
  gstNo: user.gstNo || "",
  upiId: user.upiId || "",
  avatarUrl: user.avatarUrl || "",
  registeredAt: user.createdAt,
  subscription: subscriptionView(user),
});
const tokenFor = (user, session) => jwt.sign(
  { sub: user._id.toString(), sid: session.sessionId },
  process.env.JWT_SECRET,
  { expiresIn: `${session.sessionDays}d`, issuer: "smart-billing-api" },
);

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

exports.requestRegistration = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const storeName = String(req.body.storeName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/[\s()-]/g, "");
    const password = String(req.body.password || "");
    if (!name || !storeName || !/^\S+@\S+\.\S+$/.test(email) || !/^\+?\d{10,15}$/.test(phone) || password.length < 8) {
      return res.status(400).json({ success: false, message: "Name, store, valid email, mobile number and an 8 character password are required" });
    }
    if (await User.exists({ email })) return res.status(409).json({ success: false, code: "ACCOUNT_EXISTS", message: "Email already registered. Log in or reset your password." });
    const code = String(crypto.randomInt(100000, 1000000));
    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        email,
        name,
        storeName,
        phone,
        passwordHash: await bcrypt.hash(password, 12),
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    try {
      await sendRegistrationCode(email, code);
    } catch (error) {
      await PendingRegistration.deleteOne({ email });
      throw error;
    }
    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ success: false, code: error.code === 11000 ? "ACCOUNT_EXISTS" : "REGISTRATION_FAILED", message: error.code === 11000 ? "Email already registered" : error.message });
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: "Enter the email and 6 digit verification code" });
    }
    normalizeDevice(req.body);
    const pending = await PendingRegistration.findOne({
      email,
      codeHash: hashCode(code),
      expiresAt: { $gt: new Date() },
    }).select("+passwordHash +codeHash");
    if (!pending) return res.status(400).json({ success: false, message: "Verification code is invalid or expired" });
    if (await User.exists({ email })) {
      await PendingRegistration.deleteOne({ email });
      return res.status(409).json({ success: false, code: "ACCOUNT_EXISTS", message: "Email already registered. Log in instead." });
    }
    const trialStartedAt = new Date();
    const user = await User.create({
      name: pending.name,
      storeName: pending.storeName,
      phone: pending.phone,
      email: pending.email,
      password: pending.passwordHash,
      role: "user",
      subscription: {
        status: "trialing",
        trialStartedAt,
        trialEndsAt: new Date(trialStartedAt.getTime() + trialDays() * 24 * 60 * 60 * 1000),
      },
    });
    await PendingRegistration.deleteOne({ _id: pending._id });
    const session = await establishDeviceSession(user, req.body);
    res.status(201).json({
      success: true,
      data: { user: publicUser(user), token: tokenFor(user, session) },
    });
  } catch (error) {
    const duplicate = error.code === 11000;
    res.status(duplicate ? 409 : (error.status || 400)).json({
      success: false,
      code: duplicate ? "ACCOUNT_EXISTS" : (error.code || "VERIFICATION_FAILED"),
      message: duplicate ? "Email already registered" : error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("Server authentication is not configured");
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    await ensureTrial(user);
    const session = await establishDeviceSession(user, req.body);
    res.json({
      success: true,
      data: { user: publicUser(user), token: tokenFor(user, session) },
    });
  } catch (error) {
    res.status(error.status || 400).json({
      success: false,
      code: error.code || "LOGIN_FAILED",
      message: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  await DeviceSession.deleteOne({
    userId: req.userId,
    sessionIdHash: hashValue(req.authSessionId),
  });
  return res.json({ success: true });
};

exports.me = async (req, res) => {
  await ensureTrial(req.user);
  res.json({ success: true, data: publicUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const storeName = String(req.body.storeName || "").trim();
  const phone = String(req.body.phone || "").replace(/[\s()-]/g, "");
  const gstNo = String(req.body.gstNo || "").trim().toUpperCase();
  const upiId = Object.prototype.hasOwnProperty.call(req.body, "upiId")
    ? normalizeUpiId(req.body.upiId)
    : (req.user.upiId || "");
  const avatarUrl = String(req.body.avatarUrl || "").trim();
  if (!name || !storeName) return res.status(400).json({ success: false, message: "Name and store name are required" });
  if (!/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid mobile number" });
  if (gstNo && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNo)) {
    return res.status(400).json({ success: false, message: "Enter a valid 15-character GST number" });
  }
  if (upiId && !isValidUpiId(upiId)) {
    return res.status(400).json({ success: false, message: "Enter a valid UPI ID or leave it blank" });
  }
  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, storeName, phone, gstNo, upiId, avatarUrl },
    { returnDocument: "after", runValidators: true },
  );
  res.json({ success: true, data: publicUser(user) });
};

exports.changePassword = async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must have at least 8 characters" });
  const user = await User.findById(req.userId).select("+password");
  if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ success: false, message: "Current password is incorrect" });
  user.password = await bcrypt.hash(newPassword, 12);
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
    user.passwordResetHash = hashCode(code);
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
  const code = String(req.body.code || "").trim();
  const newPassword = String(req.body.newPassword || "");
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter a valid 6 digit reset code" });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must have at least 8 characters" });
  const user = await User.findOne({ email, passwordResetHash: hashCode(code), passwordResetExpires: { $gt: new Date() } }).select("+password +passwordResetHash +passwordResetExpires");
  if (!user) return res.status(400).json({ success: false, message: "Reset code is invalid or expired" });
  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordResetHash = null;
  user.passwordResetExpires = null;
  await user.save();
  await revokeUserSessions(user._id);
  res.json({ success: true });
};
