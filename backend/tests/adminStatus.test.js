const assert = require("node:assert/strict");
const test = require("node:test");

const { matchesAdminStatus } = require("../src/utils/adminStatus");

const activeUser = {
  accountAccess: { paused: false },
  subscription: {
    status: "active",
    providerStatus: "active",
    priceChange: { required: false },
  },
};

test("active_unpaused includes subscribed users with app access", () => {
  assert.equal(matchesAdminStatus(activeUser, "active_unpaused"), true);
});

test("active_unpaused excludes accounts paused by admin", () => {
  const pausedUser = {
    ...activeUser,
    accountAccess: { paused: true },
  };
  assert.equal(matchesAdminStatus(pausedUser, "active_unpaused"), false);
  assert.equal(matchesAdminStatus(pausedUser, "admin_paused"), true);
});

test("resumed accounts leave the admin-paused filter", () => {
  const resumedUser = {
    ...activeUser,
    accountAccess: { paused: false },
  };
  assert.equal(matchesAdminStatus(resumedUser, "admin_paused"), false);
  assert.equal(matchesAdminStatus(resumedUser, "active_unpaused"), true);
});

test("other subscription filters retain their existing behavior", () => {
  assert.equal(matchesAdminStatus(activeUser, "active"), true);
  assert.equal(matchesAdminStatus(activeUser, "trial_active"), false);
  assert.equal(matchesAdminStatus({
    ...activeUser,
    subscription: {
      ...activeUser.subscription,
      priceChange: { required: true },
    },
  }, "price_change"), true);
});
