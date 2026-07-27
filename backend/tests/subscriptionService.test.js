const assert = require("node:assert/strict");
const crypto = require("crypto");
const test = require("node:test");
const {
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
