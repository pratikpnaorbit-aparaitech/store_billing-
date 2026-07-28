const jwt = require("jsonwebtoken");
const DeviceSession = require("../models/DeviceSession");
const User = require("../models/User");
const { hashValue } = require("../services/deviceSessionService");

module.exports = async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "smart-billing-api" });
    if (!payload.sid) {
      return res.status(401).json({
        success: false,
        code: "SESSION_UPGRADE_REQUIRED",
        message: "Please log in again to secure this account to your phone.",
      });
    }
    const deviceId = String(req.get("x-device-id") || "").trim();
    if (deviceId.length < 16) {
      return res.status(401).json({
        success: false,
        code: "DEVICE_ID_REQUIRED",
        message: "Secure device identity is missing. Please log in again.",
      });
    }
    const session = await DeviceSession.findOne({
      userId: payload.sub,
      sessionIdHash: hashValue(payload.sid),
      deviceIdHash: hashValue(deviceId),
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      return res.status(401).json({
        success: false,
        code: "DEVICE_SESSION_INVALID",
        message: "This account session was signed out or moved to another phone.",
      });
    }
    const user = await User.findById(payload.sub)
      .select("_id name email phone storeName role subscription accountAccess createdAt updatedAt");
    if (!user) return res.status(401).json({ success: false, message: "Account no longer exists" });
    req.user = user;
    req.userId = user._id;
    req.authSessionId = payload.sid;
    req.deviceSession = session;
    if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      DeviceSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
    }
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      code: error.code || "SESSION_INVALID",
      message: "Session is invalid or expired",
    });
  }
};
