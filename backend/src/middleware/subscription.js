const { subscriptionView } = require("../services/subscriptionService");

module.exports = function requireSubscription(req, res, next) {
  const subscription = subscriptionView(req.user);
  if (!subscription.accessAllowed) {
    return res.status(402).json({
      success: false,
      code: "SUBSCRIPTION_REQUIRED",
      message: "Your free trial has ended. Activate the ₹300 monthly plan to continue.",
      data: subscription,
    });
  }
  req.subscription = subscription;
  return next();
};
