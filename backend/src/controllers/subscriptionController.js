const crypto = require("crypto");
const CheckoutSession = require("../models/CheckoutSession");
const User = require("../models/User");
const {
  applyProviderSubscription,
  ensureTrial,
  findUserForProviderSubscription,
  providerSubscriptionForCheckout,
  razorpayClient,
  recordEvent,
  subscriptionAmount,
  subscriptionView,
  syncProviderSubscription,
  verifySubscriptionSignature,
  verifyWebhookSignature,
} = require("../services/subscriptionService");

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

function requestOrigin(req) {
  return String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

function checkoutHtml({ checkout, user, token, redirectUrl, nonce }) {
  const displayAmount = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(subscriptionAmount() / 100);
  const options = {
    key: String(process.env.RAZORPAY_KEY_ID || ""),
    subscription_id: checkout.id,
    name: "Smart Billing",
    description: `₹${displayAmount} monthly subscription`,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone || "",
    },
    notes: {
      userId: user._id.toString(),
      product: "smart-billing",
    },
    theme: { color: "#0A46E4" },
    modal: { escape: true, confirm_close: true },
  };
  const config = { options, token, redirectUrl };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <title>Smart Billing Subscription</title>
  <style nonce="${nonce}">
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#eef4ff,#f8fafc);font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a}
    .card{width:min(440px,100%);background:#fff;border:1px solid #dbe5f3;border-radius:28px;padding:30px;box-shadow:0 24px 70px rgba(15,23,42,.14)}
    .brand{font-size:18px;font-weight:900;color:#0a46e4}.icon{width:64px;height:64px;display:grid;place-items:center;border-radius:22px;background:#eaf1ff;color:#0a46e4;font-size:30px;margin:24px 0}
    h1{font-size:28px;line-height:1.2;margin:0}.sub{color:#64748b;line-height:1.6;margin:12px 0 22px}.price{display:flex;align-items:end;gap:7px;padding:18px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0}
    .price strong{font-size:34px;color:#0a46e4}.price span{color:#64748b;padding-bottom:6px}.features{list-style:none;padding:0;margin:22px 0}.features li{margin:11px 0;color:#334155}.features li:before{content:"✓";color:#16a34a;font-weight:900;margin-right:10px}
    button{width:100%;min-height:56px;border:0;border-radius:18px;background:#0a46e4;color:#fff;font-weight:900;font-size:15px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}
    .secondary{margin-top:10px;background:#fff;color:#334155;border:1px solid #cbd5e1}.message{min-height:22px;text-align:center;color:#64748b;font-size:13px;margin-top:14px}.secure{text-align:center;color:#94a3b8;font-size:12px;margin-top:18px}
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <main class="card">
    <div class="brand">SMART BILLING</div>
    <div class="icon">₹</div>
    <h1>Continue with Smart Billing</h1>
    <p class="sub">Your 7-day free trial is complete. Authorise the monthly plan to keep billing, inventory and reports active.</p>
    <div class="price"><strong>₹${displayAmount}</strong><span>/ month</span></div>
    <ul class="features"><li>Recurring monthly access</li><li>Secure Razorpay checkout</li><li>Cancel from Razorpay when required</li></ul>
    <button id="pay">Continue to Razorpay</button>
    <button id="back" class="secondary" type="button">Back to app</button>
    <div id="message" class="message"></div>
    <div class="secure">Payment details are handled securely by Razorpay.</div>
  </main>
  <script nonce="${nonce}">
    const config = ${safeJson(config)};
    const payButton = document.getElementById("pay");
    const message = document.getElementById("message");
    const finish = (status) => {
      const separator = config.redirectUrl.includes("?") ? "&" : "?";
      window.location.replace(config.redirectUrl + separator + "status=" + encodeURIComponent(status));
    };
    document.getElementById("back").addEventListener("click", () => finish("cancelled"));
    payButton.addEventListener("click", () => {
      message.textContent = "";
      const checkout = new Razorpay({
        ...config.options,
        handler: async (response) => {
          payButton.disabled = true;
          message.textContent = "Verifying your subscription…";
          try {
            const verifyResponse = await fetch("/api/subscriptions/checkout/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                token: config.token,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            if (!verifyResponse.ok) throw new Error("Verification failed");
            finish("success");
          } catch {
            payButton.disabled = false;
            message.textContent = "Payment was received but verification is pending. Return to the app and tap Refresh.";
          }
        },
        modal: {
          ...config.options.modal,
          ondismiss: () => { message.textContent = "Checkout closed. You can try again when ready."; }
        }
      });
      checkout.on("payment.failed", (response) => {
        message.textContent = response.error?.description || "Payment could not be completed.";
      });
      checkout.open();
    });
  </script>
</body>
</html>`;
}

exports.getStatus = async (req, res) => {
  await ensureTrial(req.user);
  const lastSync = req.user.subscription?.lastSyncedAt?.getTime?.() || 0;
  if (req.user.subscription?.razorpaySubscriptionId && Date.now() - lastSync > 60 * 1000) {
    try {
      await syncProviderSubscription(req.user);
    } catch {
      // The locally verified status remains usable when Razorpay is temporarily unavailable.
    }
  }
  return res.json({ success: true, data: subscriptionView(req.user) });
};

exports.getPlan = (req, res) => res.json({
  success: true,
  data: {
    name: "Smart Billing Monthly",
    amount: subscriptionAmount() / 100,
    amountPaise: subscriptionAmount(),
    currency: "INR",
    interval: "month",
    trialDays: Math.max(1, Number(process.env.TRIAL_DAYS || 7)),
  },
});

exports.createCheckoutSession = async (req, res) => {
  try {
    await ensureTrial(req.user);
    const current = subscriptionView(req.user);
    if (current.trialActive) {
      return res.status(409).json({
        success: false,
        code: "TRIAL_ACTIVE",
        message: `Your free trial is active until ${current.trialEndsAt}. Payment becomes available after the trial.`,
        data: current,
      });
    }
    if (current.accessAllowed) {
      return res.status(409).json({
        success: false,
        code: "SUBSCRIPTION_ACTIVE",
        message: "Your monthly subscription is already active.",
        data: current,
      });
    }

    const checkout = await providerSubscriptionForCheckout(req.user);
    const token = crypto.randomBytes(32).toString("hex");
    await CheckoutSession.create({
      tokenHash: sha256(token),
      userId: req.userId,
      razorpaySubscriptionId: checkout.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    const origin = requestOrigin(req);
    return res.status(201).json({
      success: true,
      data: {
        checkoutUrl: `${origin}/api/subscriptions/checkout/${token}`,
        redirectUrl: process.env.APP_DEEP_LINK || "smartbilling://subscription/payment",
        subscriptionId: checkout.id,
      },
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      code: "CHECKOUT_UNAVAILABLE",
      message: error.error?.description || error.message || "Could not start Razorpay checkout",
    });
  }
};

exports.showCheckout = async (req, res) => {
  const session = await CheckoutSession.findOne({
    tokenHash: sha256(req.params.token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return res.status(404).send("This checkout link is invalid or has expired.");

  const user = await User.findById(session.userId);
  if (!user) return res.status(404).send("Account not found.");
  let checkout;
  try {
    checkout = await razorpayClient().subscriptions.fetch(session.razorpaySubscriptionId);
  } catch {
    return res.status(502).send("Razorpay checkout is temporarily unavailable. Please try again.");
  }

  const nonce = crypto.randomBytes(18).toString("base64");
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://checkout.razorpay.com`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.razorpay.com https://*.razorpay.com",
      "frame-src https://api.razorpay.com https://*.razorpay.com",
      "form-action 'self' https://api.razorpay.com https://*.razorpay.com",
    ].join("; "),
  });
  return res.type("html").send(checkoutHtml({
    checkout,
    user,
    token: req.params.token,
    redirectUrl: process.env.APP_DEEP_LINK || "smartbilling://subscription/payment",
    nonce,
  }));
};

exports.verifyCheckout = async (req, res) => {
  const token = String(req.body.token || "");
  const paymentId = String(req.body.razorpay_payment_id || "");
  const subscriptionId = String(req.body.razorpay_subscription_id || "");
  const signature = String(req.body.razorpay_signature || "");
  const session = await CheckoutSession.findOne({
    tokenHash: sha256(token),
    razorpaySubscriptionId: subscriptionId,
    expiresAt: { $gt: new Date() },
  });
  if (!session || !verifySubscriptionSignature({ paymentId, subscriptionId, signature })) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  const user = await User.findById(session.userId);
  if (!user) return res.status(404).json({ success: false, message: "Account not found" });
  let entity;
  try {
    entity = await razorpayClient().subscriptions.fetch(subscriptionId);
  } catch {
    entity = { id: subscriptionId, status: "authenticated" };
  }
  if (entity.status === "created") entity.status = "authenticated";
  await applyProviderSubscription(user, entity, {
    eventType: "subscription.authenticated",
    paymentId,
    paymentAt: new Date(),
  });
  session.status = "verified";
  session.paymentId = paymentId;
  await session.save();
  await recordEvent({
    type: "subscription.authenticated",
    userId: user._id,
    subscription: entity,
    payment: { id: paymentId, amount: 0, currency: "INR", created_at: Math.floor(Date.now() / 1000) },
  });
  return res.json({ success: true, data: subscriptionView(user) });
};

exports.webhook = async (req, res) => {
  const signature = req.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: "Invalid webhook signature" });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Invalid webhook payload" });
  }
  const eventType = String(payload.event || "");
  const entity = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;
  if (!eventType.startsWith("subscription.") || !entity) {
    return res.json({ success: true, ignored: true });
  }

  const user = await findUserForProviderSubscription(entity);
  if (user) {
    await applyProviderSubscription(user, entity, { eventType, payment });
    await recordEvent({
      type: eventType,
      userId: user._id,
      subscription: entity,
      payment,
      occurredAt: payload.created_at ? new Date(payload.created_at * 1000) : new Date(),
    });
  }
  return res.json({ success: true });
};
