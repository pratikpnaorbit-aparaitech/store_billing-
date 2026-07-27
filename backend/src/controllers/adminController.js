const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const DeviceSession = require("../models/DeviceSession");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const User = require("../models/User");
const {
  ACTIVE_STATUSES,
  listActivePlans,
  planView,
  publishPlan,
  subscriptionView,
} = require("../services/subscriptionService");

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
  const deviceSessions = await DeviceSession.find({
    userId: { $in: rawUsers.map((user) => user._id) },
    expiresAt: { $gt: new Date() },
  }).lean();
  const sessionByUser = new Map(deviceSessions.map((session) => [String(session.userId), session]));
  users.forEach((user) => {
    const session = sessionByUser.get(String(user.id));
    user.deviceSession = session ? {
      active: true,
      deviceName: session.deviceName,
      platform: session.platform,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
    } : { active: false };
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
  summary.monthlyRecurringRevenue = Math.round(users.reduce((total, user) => {
    if (user.subscription.status !== "active") return total;
    const amount = Number(user.subscription.plan?.amount || 0);
    const duration = Math.max(1, Number(user.subscription.plan?.durationMonths || 1));
    return total + (amount / duration);
  }, 0) * 100) / 100;

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

exports.plans = async (req, res) => {
  try {
    const plans = await listActivePlans();
    return res.json({ success: true, data: { plans: plans.map(planView) } });
  } catch (error) {
    return res.status(503).json({ success: false, message: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const durationMonths = Number(req.params.durationMonths);
    const amountRupees = Number(req.body.amount);
    if (!Number.isFinite(amountRupees)) {
      return res.status(400).json({ success: false, message: "Enter a valid plan price" });
    }
    const plan = await publishPlan({
      durationMonths,
      amountPaise: Math.round(amountRupees * 100),
      adminEmail: req.admin.email,
    });
    return res.json({
      success: true,
      data: {
        plan: planView(plan),
        message: "New users will now receive this price. Existing subscriptions keep their original price.",
      },
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      success: false,
      message: error.error?.description || error.message || "Could not publish the plan",
    });
  }
};

exports.extendTrial = async (req, res) => {
  try {
    const days = Number(req.body.days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Trial extension must be between 1 and 365 whole days",
      });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const providerStatus = String(user.subscription?.status || "").toLowerCase();
    if (ACTIVE_STATUSES.has(providerStatus)) {
      return res.status(409).json({
        success: false,
        message: "This user already has an active paid subscription",
      });
    }

    const now = new Date();
    const currentEnd = user.subscription?.trialEndsAt
      ? new Date(user.subscription.trialEndsAt)
      : now;
    const base = currentEnd > now ? currentEnd : now;
    const nextEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      status: "trialing",
      trialStartedAt: user.subscription?.trialStartedAt || user.createdAt || now,
      trialEndsAt: nextEnd,
      lastEvent: "trial.extended",
    };
    await user.save();
    await SubscriptionEvent.create({
      dedupeKey: `trial.extended:${user._id}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
      userId: user._id,
      type: "trial.extended",
      status: "trialing",
      amount: 0,
      currency: "INR",
      occurredAt: now,
    });
    return res.json({
      success: true,
      data: {
        userId: user._id,
        subscription: subscriptionView(user),
        message: `Free trial extended by ${days} day${days === 1 ? "" : "s"}`,
      },
    });
  } catch (error) {
    return res.status(error.name === "CastError" ? 404 : 400).json({
      success: false,
      message: error.name === "CastError" ? "User not found" : error.message,
    });
  }
};

exports.forceLogout = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("_id");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await DeviceSession.deleteMany({ userId: user._id });
    return res.json({
      success: true,
      data: { message: "The user's active phone has been signed out" },
    });
  } catch (error) {
    return res.status(error.name === "CastError" ? 404 : 400).json({
      success: false,
      message: error.name === "CastError" ? "User not found" : error.message,
    });
  }
};
