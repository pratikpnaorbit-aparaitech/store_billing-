const jwt = require("jsonwebtoken");

module.exports = function requireAdmin(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || !process.env.JWT_SECRET) throw new Error("Missing token");
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "smart-billing-api",
      audience: "smart-billing-admin",
    });
    if (payload.role !== "admin") throw new Error("Invalid role");
    req.admin = { email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Admin session is invalid or expired" });
  }
};
