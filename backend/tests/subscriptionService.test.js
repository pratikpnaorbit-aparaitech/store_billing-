const assert = require("node:assert/strict");
const crypto = require("crypto");
const test = require("node:test");
const {
  planView,
  priceChangeForSubscription,
  subscriptionView,
  verifySubscriptionSignature,
} = require("../src/services/subscriptionService");

const createdAt = new Date("2026-07-01T00:00:00.000Z");
const baseUser = {
  createdAt,
  subscription: {
    status: "trialing",
    trialStartedAt: createdAt,
    trialEndsAt: new Date("2026-07-08T00:00:00.000Z"),
  },
};

test("grants exactly seven days of free trial access", () => {
  const active = subscriptionView(baseUser, new Date("2026-07-07T23:59:59.000Z"));
  assert.equal(active.status, "trial_active");
  assert.equal(active.accessAllowed, true);

  const expired = subscriptionView(baseUser, new Date("2026-07-08T00:00:00.000Z"));
  assert.equal(expired.status, "trial_expired");
  assert.equal(expired.accessAllowed, false);
});

test("grants access only for healthy or already-paid subscription periods", () => {
  const active = subscriptionView({
    ...baseUser,
    subscription: { ...baseUser.subscription, status: "active" },
  }, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(active.accessAllowed, true);

  const cancelledPaidThrough = subscriptionView({
    ...baseUser,
    subscription: {
      ...baseUser.subscription,
      status: "cancelled",
      currentPeriodEnd: new Date("2026-08-05T00:00:00.000Z"),
    },
  }, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(cancelledPaidThrough.accessAllowed, true);

  const halted = subscriptionView({
    ...baseUser,
    subscription: { ...baseUser.subscription, status: "halted" },
  }, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(halted.accessAllowed, false);
});

test("admin pause overrides an otherwise active subscription", () => {
  const paused = subscriptionView({
    ...baseUser,
    accountAccess: {
      paused: true,
      pauseReason: "Subscription price update is pending",
      pausedAt: new Date("2026-08-01T00:00:00.000Z"),
    },
    subscription: { ...baseUser.subscription, status: "active" },
  }, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(paused.adminPaused, true);
  assert.equal(paused.accessAllowed, false);
  assert.equal(paused.accountPauseReason, "Subscription price update is pending");
});

test("verifies Razorpay subscription signatures without trusting the client", () => {
  process.env.RAZORPAY_KEY_SECRET = "test-signature-secret";
  const paymentId = "pay_example";
  const subscriptionId = "sub_example";
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  assert.equal(verifySubscriptionSignature({ paymentId, subscriptionId, signature }), true);
  assert.equal(verifySubscriptionSignature({ paymentId, subscriptionId, signature: `${signature.slice(0, -1)}0` }), false);
});

test("uses the server-configured testing price in entitlement responses", () => {
  const previousAmount = process.env.SUBSCRIPTION_AMOUNT_PAISE;
  process.env.SUBSCRIPTION_AMOUNT_PAISE = "100";
  try {
    const view = subscriptionView(baseUser, new Date("2026-07-07T00:00:00.000Z"));
    assert.equal(view.plan.amount, 1);
    assert.equal(view.plan.amountPaise, 100);
  } finally {
    if (previousAmount === undefined) delete process.env.SUBSCRIPTION_AMOUNT_PAISE;
    else process.env.SUBSCRIPTION_AMOUNT_PAISE = previousAmount;
  }
});

test("keeps a subscriber's authorised plan snapshot when admin prices change", () => {
  const view = subscriptionView({
    ...baseUser,
    subscription: {
      ...baseUser.subscription,
      status: "active",
      planName: "3 Month Plan",
      planDurationMonths: 3,
      planAmountPaise: 45000,
      planCurrency: "INR",
      planVersion: 4,
    },
  }, new Date("2026-08-01T00:00:00.000Z"));
  assert.deepEqual(view.plan, {
    id: "",
    name: "3 Month Plan",
    durationMonths: 3,
    amount: 450,
    amountPaise: 45000,
    currency: "INR",
    version: 4,
    interval: "3 months",
  });
});

test("detects a newer immutable price for an existing autopay", () => {
  const notice = priceChangeForSubscription({
    status: "active",
    catalogPlanId: "old-plan-id",
    razorpaySubscriptionId: "sub_existing",
    planName: "1 Month Plan",
    planDurationMonths: 1,
    planAmountPaise: 30000,
    planVersion: 1,
  }, [{
    _id: "new-plan-id",
    key: "1-month-v2",
    name: "1 Month Plan",
    durationMonths: 1,
    amountPaise: 25000,
    currency: "INR",
    version: 2,
  }]);
  assert.equal(notice.required, true);
  assert.equal(notice.currentPlan.amount, 300);
  assert.equal(notice.latestPlan.amount, 250);
  assert.equal(notice.targetPlanId, "new-plan-id");
});

test("serializes a dynamic plan for the app without exposing provider secrets", () => {
  assert.deepEqual(planView({
    _id: "plan-catalog-id",
    key: "6-month-v2",
    name: "6 Month Plan",
    durationMonths: 6,
    amountPaise: 300,
    currency: "INR",
    version: 2,
    razorpayPlanIds: { live: "plan_secret_provider_id" },
  }), {
    id: "plan-catalog-id",
    key: "6-month-v2",
    name: "6 Month Plan",
    durationMonths: 6,
    amount: 3,
    amountPaise: 300,
    currency: "INR",
    version: 2,
  });
});
