# Smart Billing subscription setup

## Implemented behaviour

- Every verified account receives a server-timed 7-day free trial.
- The app remains usable while the trial is active.
- After the trial ends, business APIs return `402 SUBSCRIPTION_REQUIRED` and the
  Expo app shows the Razorpay subscription screen.
- Razorpay Checkout authorises a recurring ₹300/month subscription.
- Payment signatures are verified on the backend. The Razorpay secret is never
  bundled into the Expo app or landing page.
- The admin dashboard shows registration time, trial start/end, provider status,
  current period end, next charge and last payment for every user.

## Render environment

Deploy the `backend` directory and configure these values on the Render service:

```dotenv
NODE_ENV=production
MONGODB_URI=...
AUTH_MONGODB_URI=...
JWT_SECRET=...
CORS_ORIGINS=https://your-landing-page.example
PUBLIC_API_URL=https://store-billing-3ze0.onrender.com
APP_DEEP_LINK=smartbilling://subscription/payment

TRIAL_DAYS=7
SUBSCRIPTION_AMOUNT_PAISE=30000
RAZORPAY_TOTAL_COUNT=120
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID=

ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

Keep the existing email and optional Cloudinary variables configured as well.
`CORS_ORIGINS=*` is intentionally rejected in production.

When `RAZORPAY_PLAN_ID` is blank, the backend creates the ₹300 monthly plan once
on the first checkout and stores its plan ID in MongoDB.

## Razorpay webhook

In Razorpay Dashboard, add this Live Mode webhook URL:

```text
https://store-billing-3ze0.onrender.com/api/subscriptions/webhook
```

Use the exact same value configured as `RAZORPAY_WEBHOOK_SECRET` on Render and
subscribe to these events:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`
- `subscription.expired`
- `subscription.paused`
- `subscription.resumed`
- `subscription.updated`

Checkout signature verification provides the immediate app response. Webhooks
keep renewals, failures, cancellations and end dates accurate afterward.

## Frontend environment

Expo app:

```dotenv
EXPO_PUBLIC_API_URL=https://store-billing-3ze0.onrender.com
```

Landing/admin site:

```dotenv
VITE_API_URL=https://store-billing-3ze0.onrender.com
```

After the backend deployment, rebuild the Expo app and landing site so both use
the production API.

## Verification commands

```text
# Expo app
npm run check

# Backend
cd backend
npm test

# Landing page
npm run lint
npm run build
```
