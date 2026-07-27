const crypto = require("crypto");
const DeviceSession = require("../models/DeviceSession");

const SESSION_DAYS = Math.min(90, Math.max(1, Number(process.env.SESSION_DAYS || 30)));
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeDevice(body = {}) {
  const deviceId = String(body.deviceId || "").trim();
  if (deviceId.length < 16 || deviceId.length > 200) {
    const error = new Error("This app build cannot create a secure device session. Please update the app.");
    error.code = "DEVICE_ID_REQUIRED";
    error.status = 400;
    throw error;
  }
  return {
    deviceId,
    deviceIdHash: hashValue(deviceId),
    deviceName: String(body.deviceName || "Mobile device").trim().slice(0, 120) || "Mobile device",
    platform: String(body.platform || "unknown").trim().slice(0, 30) || "unknown",
  };
}

async function establishDeviceSession(user, body = {}) {
  const device = normalizeDevice(body);
  const now = new Date();
  const existing = await DeviceSession.findOne({ userId: user._id });
  if (
    existing
    && existing.expiresAt > now
    && existing.deviceIdHash !== device.deviceIdHash
  ) {
    const error = new Error(
      `This account is already active on ${existing.deviceName || "another phone"}. Log out there first, or use Forgot Password to release the old phone.`,
    );
    error.code = "DEVICE_ALREADY_ACTIVE";
    error.status = 409;
    throw error;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await DeviceSession.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      sessionIdHash: hashValue(sessionId),
      deviceIdHash: device.deviceIdHash,
      deviceName: device.deviceName,
      platform: device.platform,
      lastSeenAt: now,
      expiresAt,
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  return { sessionId, expiresAt, sessionDays: SESSION_DAYS };
}

async function revokeUserSessions(userId) {
  await DeviceSession.deleteMany({ userId });
}

module.exports = {
  establishDeviceSession,
  hashValue,
  normalizeDevice,
  revokeUserSessions,
  SESSION_DAYS,
};
