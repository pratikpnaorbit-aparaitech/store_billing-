function matchesAdminStatus(user, statusFilter = "all") {
  const status = String(statusFilter || "all").trim().toLowerCase();
  const paused = Boolean(user.accountAccess?.paused);
  const subscriptionStatus = String(user.subscription?.status || "").toLowerCase();
  const providerStatus = String(user.subscription?.providerStatus || "").toLowerCase();

  if (status === "all") return true;
  if (status === "admin_paused") return paused;
  if (status === "active_unpaused") return subscriptionStatus === "active" && !paused;
  if (status === "price_change") return Boolean(user.subscription?.priceChange?.required);
  return subscriptionStatus === status || providerStatus === status;
}

module.exports = {
  matchesAdminStatus,
};
