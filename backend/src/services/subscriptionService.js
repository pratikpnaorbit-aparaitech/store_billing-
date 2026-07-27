const crypto = require("crypto");
const Razorpay = require("razorpay");
const AppConfig = require("../models/AppConfig");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const User = require("../models/User");

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["authenticated", "active"]);
const TERMINAL_STATUSES = new Set(["cancelled", "completed", "expired", "halted"]);

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

function subscriptionView(user, now = new Date()) {
  const subscription = user.subscription || {};
  const { startedAt, endsAt } = trialDates(user, now);
  const rawStatus = String(subscription.status || "trialing").toLowerCase();
  const currentPeriodEnd = asDate(subscription.currentPeriodEnd);
  const trialActive = now < endsAt && !ACTIVE_STATUSES.has(rawStatus);
  const paidThrough = currentPeriodEnd && currentPeriodEnd > now;
  const paidActive = ACTIVE_STATUSES.has(rawStatus)
    || (["cancelled", "completed"].includes(rawStatus) && paidThrough);
  const accessAllowed = Boolean(trialActive || paidActive);
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
    plan: {
      name: "Smart Billing Monthly",
      amount: subscriptionAmount() / 100,
      amountPaise: subscriptionAmount(),
      currency: "INR",
      interval: "month",
    },
    razorpaySubscriptionId: subscription.razorpaySubscriptionId || "",
    currentPeriodStart: asDate(subscription.currentPeriodStart)?.toISOString() || null,
    currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
    nextChargeAt: asDate(subscription.nextChargeAt)?.toISOString() || null,
    endedAt: asDate(subscription.endedAt)?.toISOString() || null,
    lastPaymentId: subscription.lastPaymentId || "",
    lastPaymentAt: asDate(subscription.lastPaymentAt)?.toISOString() || null,
    lastEvent: subscription.lastEvent || "",
    serverNow: now.toISOString(),
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

async function ensureMonthlyPlan() {
  const configuredPlanId = String(process.env.RAZORPAY_PLAN_ID || "").trim();
  if (configuredPlanId) return configuredPlanId;

  const configKey = `razorpay-monthly-${subscriptionAmount()}-inr`;
  const existing = await AppConfig.findOne({ key: configKey }).lean();
  if (existing?.value?.planId) return existing.value.planId;

  const plan = await razorpayClient().plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "Smart Billing Monthly",
      amount: subscriptionAmount(),
      currency: "INR",
      description: "Monthly access to Smart Billing after the 7-day free trial",
    },
    notes: { product: "smart-billing", billing: "monthly" },
  });
  await AppConfig.findOneAndUpdate(
    { key: configKey },
    { key: configKey, value: { planId: plan.id } },
    { upsert: true, returnDocument: "after" },
  );
  return plan.id;
}

async function createProviderSubscription(user) {
  const planId = await ensureMonthlyPlan();
  const totalCount = Math.min(1200, Math.max(1, Number(process.env.RAZORPAY_TOTAL_COUNT || 120)));
  const providerSubscription = await razorpayClient().subscriptions.create({
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1,
    expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    notes: {
      userId: user._id.toString(),
      email: user.email,
      product: "smart-billing",
    },
  });
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: providerSubscription.status || "created",
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

async function providerSubscriptionForCheckout(user) {
  const existingId = user.subscription?.razorpaySubscriptionId;
  const existingStatus = String(user.subscription?.status || "").toLowerCase();
  if (existingId && !TERMINAL_STATUSES.has(existingStatus)) {
    try {
      const existing = await razorpayClient().subscriptions.fetch(existingId);
      if (!TERMINAL_STATUSES.has(String(existing.status || "").toLowerCase())) return existing;
    } catch {
      // Create a fresh provider subscription if the old one can no longer be fetched.
    }
  }
  return createProviderSubscription(user);
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
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    status: entity.status || user.subscription?.status || "created",
    planId: entity.plan_id || user.subscription?.planId || "",
    razorpaySubscriptionId: entity.id || user.subscription?.razorpaySubscriptionId || "",
    currentPeriodStart: unixDate(entity.current_start),
    currentPeriodEnd: unixDate(entity.current_end),
    nextChargeAt: unixDate(entity.charge_at),
    endedAt: unixDate(entity.ended_at),
    lastPaymentId: paymentId || user.subscription?.lastPaymentId || "",
    lastPaymentAt: paymentAt || (paymentId ? new Date() : user.subscription?.lastPaymentAt),
    lastEvent: options.eventType || user.subscription?.lastEvent || "",
    lastSyncedAt: new Date(),
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
  providerSubscriptionForCheckout,
  razorpayClient,
  recordEvent,
  subscriptionAmount,
  subscriptionView,
  syncProviderSubscription,
  trialDays,
  verifySubscriptionSignature,
  verifyWebhookSignature,
};
