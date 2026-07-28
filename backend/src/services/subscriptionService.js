const crypto = require("crypto");
const Razorpay = require("razorpay");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["authenticated", "active"]);
const TERMINAL_STATUSES = new Set(["cancelled", "completed", "expired", "halted"]);
const DEFAULT_PLANS = [
  { durationMonths: 1, amountPaise: 100, name: "1 Month Plan" },
  { durationMonths: 3, amountPaise: 200, name: "3 Month Plan" },
  { durationMonths: 6, amountPaise: 300, name: "6 Month Plan" },
];

const trialDays = () => Math.max(1, Number(process.env.TRIAL_DAYS || 7));
const subscriptionAmount = () => Math.max(100, Number(process.env.SUBSCRIPTION_AMOUNT_PAISE || 30000));

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function unixDate(value) {
  const number = Number(value || 0);
  return number > 0 ? new Date(number * 1000) : null;
}

function trialDates(user, now = new Date()) {
  const createdAt = asDate(user.createdAt) || now;
  const startedAt = asDate(user.subscription?.trialStartedAt) || createdAt;
  const endsAt = asDate(user.subscription?.trialEndsAt)
    || new Date(startedAt.getTime() + trialDays() * DAY_MS);
  return { startedAt, endsAt };
}

function planView(plan) {
  return {
    id: String(plan._id || plan.id || plan.key || ""),
    key: plan.key || "",
    name: plan.name,
    durationMonths: Number(plan.durationMonths),
    amount: Number(plan.amountPaise) / 100,
    amountPaise: Number(plan.amountPaise),
    currency: plan.currency || "INR",
    version: Number(plan.version || 1),
  };
}

function userPlanView(subscription = {}) {
  const amountPaise = Number(subscription.planAmountPaise || subscriptionAmount());
  const durationMonths = Number(subscription.planDurationMonths || 1);
  return {
    id: subscription.catalogPlanId ? String(subscription.catalogPlanId) : "",
    name: subscription.planName || (durationMonths === 1 ? "Smart Billing Monthly" : `${durationMonths} Month Plan`),
    durationMonths,
    amount: amountPaise / 100,
    amountPaise,
    currency: subscription.planCurrency || "INR",
    version: Number(subscription.planVersion || 1),
    interval: durationMonths === 1 ? "month" : `${durationMonths} months`,
  };
}

function priceChangeForSubscription(subscription = {}, activePlans = []) {
  const durationMonths = Number(subscription.planDurationMonths || 1);
  const currentAmountPaise = Number(subscription.planAmountPaise || 0);
  const currentVersion = Number(subscription.planVersion || 0);
  const currentCatalogPlanId = subscription.catalogPlanId
    ? String(subscription.catalogPlanId)
    : "";
  const latest = activePlans.find((plan) => Number(plan.durationMonths) === durationMonths);
  const renewableStatus = ["authenticated", "active", "pending", "halted", "paused"]
    .includes(String(subscription.status || "").toLowerCase());
  const hasExistingAutopay = Boolean(
    renewableStatus && subscription.razorpaySubscriptionId,
  );
  const latestView = latest ? planView(latest) : null;
  const changed = Boolean(
    hasExistingAutopay
    && latest
    && (
      String(latest._id || latest.id) !== currentCatalogPlanId
      || Number(latest.amountPaise) !== currentAmountPaise
      || Number(latest.version || 1) !== currentVersion
    )
  );

  return {
    required: changed || Boolean(subscription.migrationPending),
    migrationPending: Boolean(subscription.migrationPending),
    currentPlan: userPlanView(subscription),
    latestPlan: latestView,
    targetPlanId: subscription.migrationTargetCatalogPlanId
      ? String(subscription.migrationTargetCatalogPlanId)
      : latestView?.id || "",
    migrationStartsAt: asDate(subscription.migrationStartsAt)?.toISOString() || null,
    message: changed
      ? `A new price is available for your ${durationMonths}-month plan. Stop the old autopay and authorise the latest plan.`
      : subscription.migrationPending
        ? "Your old autopay is scheduled to stop. Complete the latest Razorpay plan authorisation."
        : "",
  };
}

function subscriptionView(user, now = new Date()) {
  const subscription = user.subscription || {};
  const { startedAt, endsAt } = trialDates(user, now);
  const rawStatus = String(subscription.status || "trialing").toLowerCase();
  const currentPeriodEnd = asDate(subscription.currentPeriodEnd);
  const trialActive = now < endsAt && !ACTIVE_STATUSES.has(rawStatus);
  const paidThrough = currentPeriodEnd && currentPeriodEnd > now;
  const migrationCarryAccess = Boolean(subscription.migrationPending && paidThrough);
  const paidActive = ACTIVE_STATUSES.has(rawStatus)
    || (["cancelled", "completed"].includes(rawStatus) && paidThrough)
    || migrationCarryAccess;
  const adminPaused = Boolean(user.accountAccess?.paused);
  const accessAllowed = Boolean(!adminPaused && (trialActive || paidActive));
  let status = rawStatus;
  if (paidActive) status = "active";
  else if (trialActive) status = "trial_active";
  else if (["trialing", "created", ""].includes(rawStatus)) status = "trial_expired";

  return {
    status,
    providerStatus: rawStatus,
    accessAllowed,
    trialActive,
    trialStartedAt: startedAt.toISOString(),
    trialEndsAt: endsAt.toISOString(),
    trialDaysRemaining: trialActive
      ? Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS))
      : 0,
    plan: userPlanView(subscription),
    razorpaySubscriptionId: subscription.razorpaySubscriptionId || "",
    currentPeriodStart: asDate(subscription.currentPeriodStart)?.toISOString() || null,
    currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
    nextChargeAt: asDate(subscription.nextChargeAt)?.toISOString() || null,
    endedAt: asDate(subscription.endedAt)?.toISOString() || null,
    lastPaymentId: subscription.lastPaymentId || "",
    lastPaymentAt: asDate(subscription.lastPaymentAt)?.toISOString() || null,
    lastEvent: subscription.lastEvent || "",
    migrationPending: Boolean(subscription.migrationPending),
    adminPaused,
    accountPauseReason: user.accountAccess?.pauseReason || "",
    accountPausedAt: asDate(user.accountAccess?.pausedAt)?.toISOString() || null,
    serverNow: now.toISOString(),
  };
}

async function subscriptionViewWithPriceChange(user, now = new Date()) {
  const plans = await listActivePlans();
  return {
    ...subscriptionView(user, now),
    priceChange: priceChangeForSubscription(user.subscription || {}, plans),
  };
}

async function ensureTrial(user) {
  const { startedAt, endsAt } = trialDates(user);
  if (user.subscription?.trialStartedAt && user.subscription?.trialEndsAt) return user;
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: user.subscription?.status || "trialing",
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  };
  await user.save();
  return user;
}

function razorpayClient() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function razorpayMode() {
  return String(process.env.RAZORPAY_KEY_ID || "").trim().startsWith("rzp_live_")
    ? "live"
    : "test";
}

async function ensureDefaultPlans() {
  await Promise.all(DEFAULT_PLANS.map(async (defaults) => {
    const existing = await SubscriptionPlan.findOne({
      durationMonths: defaults.durationMonths,
    }).sort({ version: -1 });
    if (existing) return;
    try {
      await SubscriptionPlan.create({
        key: `${defaults.durationMonths}-month-v1`,
        ...defaults,
        currency: "INR",
        version: 1,
        active: true,
        createdBy: "system",
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }));
}

async function listActivePlans() {
  await ensureDefaultPlans();
  const plans = await SubscriptionPlan.find({ active: true })
    .sort({ durationMonths: 1, version: -1 })
    .lean();
  const latestByDuration = new Map();
  plans.forEach((plan) => {
    if (!latestByDuration.has(plan.durationMonths)) latestByDuration.set(plan.durationMonths, plan);
  });
  return [...latestByDuration.values()].sort((left, right) => left.durationMonths - right.durationMonths);
}

async function activePlanForCheckout(requestedPlanId = "") {
  const plans = await listActivePlans();
  const requested = String(requestedPlanId || "");
  const selected = requested
    ? plans.find((plan) => String(plan._id) === requested || plan.key === requested)
    : plans.find((plan) => plan.durationMonths === 1);
  if (!selected) {
    const error = new Error("The selected subscription plan is no longer available. Refresh and choose another plan.");
    error.code = "PLAN_NOT_AVAILABLE";
    error.status = 409;
    throw error;
  }
  return selected;
}

async function ensureProviderPlan(plan) {
  const mode = razorpayMode();
  const existingId = plan.razorpayPlanIds?.[mode];
  if (existingId) return existingId;

  const providerPlan = await razorpayClient().plans.create({
    period: "monthly",
    interval: Number(plan.durationMonths),
    item: {
      name: plan.name,
      amount: Number(plan.amountPaise),
      currency: plan.currency || "INR",
      description: `${plan.durationMonths}-month Smart Billing access`,
    },
    notes: {
      product: "smart-billing",
      durationMonths: String(plan.durationMonths),
      catalogPlanId: String(plan._id),
      catalogVersion: String(plan.version),
    },
  });
  await SubscriptionPlan.updateOne(
    { _id: plan._id },
    { $set: { [`razorpayPlanIds.${mode}`]: providerPlan.id } },
  );
  return providerPlan.id;
}

async function publishPlan({ durationMonths, amountPaise, adminEmail }) {
  const duration = Number(durationMonths);
  const amount = Number(amountPaise);
  if (![1, 3, 6].includes(duration)) {
    const error = new Error("Plan duration must be 1, 3 or 6 months");
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(amount) || amount < 100 || amount > 100000000) {
    const error = new Error("Plan price must be between ₹1 and ₹10,00,000");
    error.status = 400;
    throw error;
  }

  await ensureDefaultPlans();
  const current = await SubscriptionPlan.findOne({ durationMonths: duration, active: true })
    .sort({ version: -1 });
  if (current && current.amountPaise === amount) {
    await ensureProviderPlan(current);
    return current.toObject();
  }

  const latest = await SubscriptionPlan.findOne({ durationMonths: duration })
    .sort({ version: -1 })
    .lean();
  const version = Number(latest?.version || 0) + 1;
  const plan = await SubscriptionPlan.create({
    key: `${duration}-month-v${version}`,
    name: `${duration} Month Plan`,
    durationMonths: duration,
    amountPaise: amount,
    currency: "INR",
    version,
    active: false,
    createdBy: adminEmail || "admin",
  });

  try {
    await ensureProviderPlan(plan);
    await SubscriptionPlan.updateMany(
      { durationMonths: duration, _id: { $ne: plan._id } },
      { $set: { active: false } },
    );
    plan.active = true;
    await plan.save();
    return plan.toObject();
  } catch (error) {
    await SubscriptionPlan.deleteOne({ _id: plan._id });
    throw error;
  }
}

async function createProviderSubscription(user, plan, options = {}) {
  const planId = await ensureProviderPlan(plan);
  const maximumCycles = Math.max(1, Math.floor(360 / Number(plan.durationMonths)));
  const totalCount = Math.min(
    maximumCycles,
    Math.max(1, Number(process.env.RAZORPAY_TOTAL_COUNT || 120)),
  );
  const payload = {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1,
    expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    notes: {
      userId: user._id.toString(),
      email: user.email,
      product: "smart-billing",
      catalogPlanId: String(plan._id),
      durationMonths: String(plan.durationMonths),
      catalogVersion: String(plan.version),
    },
  };
  const requestedStart = asDate(options.startAt || user.subscription?.migrationStartsAt);
  if (requestedStart && requestedStart.getTime() > Date.now() + (5 * 60 * 1000)) {
    payload.start_at = Math.floor(requestedStart.getTime() / 1000);
  }
  const providerSubscription = await razorpayClient().subscriptions.create(payload);
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: providerSubscription.status || "created",
    catalogPlanId: plan._id,
    planVersion: plan.version,
    planName: plan.name,
    planDurationMonths: plan.durationMonths,
    planAmountPaise: plan.amountPaise,
    planCurrency: plan.currency || "INR",
    planId,
    razorpaySubscriptionId: providerSubscription.id,
    nextChargeAt: unixDate(providerSubscription.charge_at),
    endedAt: null,
    lastEvent: "subscription.created",
    lastSyncedAt: new Date(),
  };
  await user.save();
  await recordEvent({
    type: "subscription.created",
    userId: user._id,
    subscription: providerSubscription,
  });
  return providerSubscription;
}

async function providerSubscriptionForCheckout(user, requestedPlanId = "") {
  const plan = await activePlanForCheckout(requestedPlanId);
  const currentPlanId = await ensureProviderPlan(plan);
  const existingId = user.subscription?.razorpaySubscriptionId;
  const existingStatus = String(user.subscription?.status || "").toLowerCase();
  if (existingId && !TERMINAL_STATUSES.has(existingStatus)) {
    try {
      const existing = await razorpayClient().subscriptions.fetch(existingId);
      const existingIsUsable = !TERMINAL_STATUSES.has(String(existing.status || "").toLowerCase());
      if (existingIsUsable && existing.plan_id === currentPlanId) {
        return { checkout: existing, plan };
      }
    } catch {
      // Create a fresh provider subscription if the old one can no longer be fetched.
    }
  }
  const checkout = await createProviderSubscription(user, plan);
  return { checkout, plan };
}

async function startSubscriptionMigration(user, requestedPlanId = "") {
  const plans = await listActivePlans();
  const targetPlan = await activePlanForCheckout(requestedPlanId);
  const notice = priceChangeForSubscription(user.subscription || {}, plans);
  if (user.subscription?.migrationPending) {
    return { user, targetPlan, notice };
  }
  if (!notice.required) {
    const error = new Error("This subscription already uses the current plan price.");
    error.code = "MIGRATION_NOT_REQUIRED";
    error.status = 409;
    throw error;
  }

  const oldSubscriptionId = String(user.subscription?.razorpaySubscriptionId || "");
  if (!oldSubscriptionId) {
    const error = new Error("The existing Razorpay autopay could not be found.");
    error.code = "AUTOPAY_NOT_FOUND";
    error.status = 409;
    throw error;
  }

  const periodEnd = asDate(user.subscription?.currentPeriodEnd);
  const cancelAtCycleEnd = Boolean(periodEnd && periodEnd > new Date());
  const cancelled = await razorpayClient().subscriptions.cancel(
    oldSubscriptionId,
    cancelAtCycleEnd,
  );
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: cancelAtCycleEnd ? (cancelled.status || user.subscription.status) : "cancelled",
    previousRazorpaySubscriptionId: oldSubscriptionId,
    razorpaySubscriptionId: "",
    migrationPending: true,
    migrationTargetCatalogPlanId: targetPlan._id,
    migrationStartedAt: new Date(),
    migrationStartsAt: cancelAtCycleEnd ? periodEnd : null,
    migrationCompletedAt: null,
    nextChargeAt: null,
    lastEvent: "subscription.migration_started",
    lastSyncedAt: new Date(),
  };
  await user.save();
  await recordEvent({
    type: "subscription.migration_started",
    userId: user._id,
    subscription: cancelled,
  });
  return {
    user,
    targetPlan,
    notice: priceChangeForSubscription(user.subscription || {}, plans),
  };
}

function verifySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  const secret = String(process.env.RAZORPAY_KEY_SECRET || "");
  if (!secret || !paymentId || !subscriptionId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  const actualBuffer = Buffer.from(String(signature), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "");
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(String(signature), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function applyProviderSubscription(user, entity, options = {}) {
  if (!user || !entity) return user;
  const paymentId = options.payment?.id || options.paymentId || "";
  const paymentAt = unixDate(options.payment?.created_at) || options.paymentAt || null;
  const entityStatus = String(entity.status || "").toLowerCase();
  const preserveMigrationPeriod = Boolean(
    user.subscription?.migrationPending && !ACTIVE_STATUSES.has(entityStatus),
  );
  const completesMigration = Boolean(
    user.subscription?.migrationPending
    && entity.id
    && entity.id !== user.subscription?.previousRazorpaySubscriptionId
    && (options.completeMigration || ACTIVE_STATUSES.has(String(entity.status || "").toLowerCase())),
  );
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: entity.status || user.subscription?.status || "created",
    planId: entity.plan_id || user.subscription?.planId || "",
    razorpaySubscriptionId: entity.id || user.subscription?.razorpaySubscriptionId || "",
    currentPeriodStart: unixDate(entity.current_start)
      || (preserveMigrationPeriod ? user.subscription?.currentPeriodStart : null),
    currentPeriodEnd: unixDate(entity.current_end)
      || (preserveMigrationPeriod ? user.subscription?.currentPeriodEnd : null),
    nextChargeAt: unixDate(entity.charge_at),
    endedAt: unixDate(entity.ended_at),
    lastPaymentId: paymentId || user.subscription?.lastPaymentId || "",
    lastPaymentAt: paymentAt || (paymentId ? new Date() : user.subscription?.lastPaymentAt),
    lastEvent: options.eventType || user.subscription?.lastEvent || "",
    lastSyncedAt: new Date(),
    ...(completesMigration ? {
      migrationPending: false,
      migrationTargetCatalogPlanId: null,
      migrationCompletedAt: new Date(),
      migrationStartsAt: null,
    } : {}),
  };
  await user.save();
  return user;
}

async function syncProviderSubscription(user) {
  const subscriptionId = user.subscription?.razorpaySubscriptionId;
  if (!subscriptionId) return user;
  const entity = await razorpayClient().subscriptions.fetch(subscriptionId);
  return applyProviderSubscription(user, entity, { eventType: "subscription.synced" });
}

async function findUserForProviderSubscription(entity) {
  const byProviderId = entity?.id
    ? await User.findOne({ "subscription.razorpaySubscriptionId": entity.id })
    : null;
  if (byProviderId) return byProviderId;
  const byPreviousProviderId = entity?.id
    ? await User.findOne({ "subscription.previousRazorpaySubscriptionId": entity.id })
    : null;
  if (byPreviousProviderId) return byPreviousProviderId;
  const noteUserId = entity?.notes?.userId;
  return noteUserId ? User.findById(noteUserId) : null;
}

async function recordEvent({ type, userId, subscription, payment, occurredAt }) {
  const subscriptionId = subscription?.id || "";
  const paymentId = payment?.id || "";
  const eventTime = occurredAt || unixDate(payment?.created_at) || new Date();
  const dedupeKey = [
    type,
    subscriptionId,
    paymentId,
    Math.floor(eventTime.getTime() / 1000),
  ].join(":");
  try {
    await SubscriptionEvent.create({
      dedupeKey,
      userId: userId || null,
      type,
      razorpaySubscriptionId: subscriptionId,
      paymentId,
      status: subscription?.status || "",
      amount: Number(payment?.amount || 0),
      currency: payment?.currency || "INR",
      occurredAt: eventTime,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

module.exports = {
  ACTIVE_STATUSES,
  applyProviderSubscription,
  ensureTrial,
  findUserForProviderSubscription,
  listActivePlans,
  planView,
  priceChangeForSubscription,
  providerSubscriptionForCheckout,
  publishPlan,
  razorpayClient,
  recordEvent,
  subscriptionAmount,
  subscriptionView,
  subscriptionViewWithPriceChange,
  startSubscriptionMigration,
  syncProviderSubscription,
  trialDays,
  verifySubscriptionSignature,
  verifyWebhookSignature,
};
