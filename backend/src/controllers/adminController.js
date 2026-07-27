const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const User = require("../models/User");
const { subscriptionView } = require("../services/subscriptionService");

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

exports.login = async (req, res) => {
  const configuredEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || "");
  if (!configuredEmail || !configuredPassword) {
    return res.status(503).json({ success: false, message: "Admin login is not configured" });
  }
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!safeEqual(email, configuredEmail) || !safeEqual(password, configuredPassword)) {
    return res.status(401).json({ success: false, message: "Invalid admin email or password" });
  }
  const token = jwt.sign(
    { role: "admin", email: configuredEmail },
    process.env.JWT_SECRET,
    { expiresIn: "8h", issuer: "smart-billing-api", audience: "smart-billing-admin" },
  );
  return res.json({
    success: true,
    data: { token, admin: { email: configuredEmail }, expiresIn: 8 * 60 * 60 },
  });
};

exports.dashboard = async (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  const statusFilter = String(req.query.status || "all").trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));

  const rawUsers = await User.find({ role: { $ne: "admin" } })
    .select("_id name storeName email phone role subscription createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();
  const users = rawUsers.map((user) => {
    const subscription = subscriptionView(user);
    return {
      id: user._id,
      name: user.name,
      storeName: user.storeName || "",
      email: user.email,
      phone: user.phone || "",
      registeredAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscription,
    };
  });

  const summary = users.reduce((totals, user) => {
    totals.totalUsers += 1;
    if (user.subscription.status === "trial_active") totals.trialActive += 1;
    if (user.subscription.status === "trial_expired") totals.trialExpired += 1;
    if (user.subscription.status === "active") totals.activeSubscriptions += 1;
    if (["pending", "halted"].includes(user.subscription.providerStatus)) totals.paymentAttention += 1;
    return totals;
  }, {
    totalUsers: 0,
    trialActive: 0,
    trialExpired: 0,
    activeSubscriptions: 0,
    paymentAttention: 0,
    monthlyRecurringRevenue: 0,
  });
  summary.monthlyRecurringRevenue = summary.activeSubscriptions * 300;

  const filtered = users.filter((user) => {
    const matchesSearch = !search
      || [user.name, user.storeName, user.email, user.phone]
        .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesStatus = statusFilter === "all"
      || user.subscription.status === statusFilter
      || user.subscription.providerStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const start = (page - 1) * limit;
  const events = await SubscriptionEvent.find()
    .sort({ occurredAt: -1 })
    .limit(30)
    .lean();

  return res.json({
    success: true,
    data: {
      summary,
      users: filtered.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / limit)),
      },
      recentEvents: events.map((event) => ({
        id: event._id,
        userId: event.userId,
        type: event.type,
        status: event.status,
        razorpaySubscriptionId: event.razorpaySubscriptionId,
        paymentId: event.paymentId,
        amount: event.amount / 100,
        currency: event.currency,
        occurredAt: event.occurredAt,
      })),
      generatedAt: new Date().toISOString(),
    },
  });
};
