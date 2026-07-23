const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "smart-billing-api" });
    const user = await User.findById(payload.sub).select("_id name email storeName");
    if (!user) return res.status(401).json({ success: false, message: "Account no longer exists" });
    req.user = user;
    req.userId = user._id;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session is invalid or expired" });
  }
};
