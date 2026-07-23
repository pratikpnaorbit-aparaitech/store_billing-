# Smart Billing

Production-oriented Expo SDK 57 billing app for stores. It includes email-OTP account verification, account authentication, tenant-isolated products/customers/orders, barcode scanning, stock-aware cart billing, GST and discounts, PDF receipts, OTP password recovery, reports, and offline read-only cache when the cloud API is temporarily unavailable.

## Local development

Requirements: Node.js 22+, npm, and an Android/iOS device or emulator.

```bash
npm ci
npm start
```

Without `EXPO_PUBLIC_API_URL`, the app runs in standalone local mode. For company deployment, configure the HTTPS backend origin (without `/api` or a trailing slash):

```text
EXPO_PUBLIC_API_URL=https://smart-billing-api.example.com
```

Never place secrets in an `EXPO_PUBLIC_` variable because Expo embeds it in the client bundle.

If the ignored local environment files are deleted, restore them from the
ServiceHub backend environment without printing credentials:

```bash
npm run env:restore -- /absolute/path/to/All_In_One_Services/backend/.env http://YOUR-LAN-IP:5001
```

The command reuses the Atlas credentials, points authentication at the existing
ServiceHub database, keeps billing data in `smart_billing`, and writes local
development configuration to `.env` and `backend/.env`.

## Backend

```bash
cd backend
npm ci
# Create backend/.env from backend/.env.example
npm start
```

Production startup validates MongoDB, JWT, CORS, Cloudinary, and SMTP configuration before accepting traffic. All business routes require a JWT and every query is scoped to the authenticated account.

For the ServiceHub integration, authentication uses the existing `all_in_one_services.users` collection and its bcrypt `password` field through `AUTH_MONGODB_URI`. Billing-owned data is isolated in the separate `smart_billing` database through `MONGODB_URI`. Brevo API email is supported directly through `BREVO_API_KEY`; SMTP remains an alternative.

When Cloudinary is not configured, local development can store validated
product images (up to 5 MB) directly with the product so the complete add/edit
flow remains testable. This fallback is disabled in production, where
Cloudinary remains required.

## Verification

```bash
npm run check
npx expo export --platform all --output-dir native-dist
cd backend
npm test
npm audit --omit=dev
```

With a development backend environment configured, `npm run test:live` performs
a controlled API/Atlas smoke test using uniquely named temporary records. It
verifies authentication, profile/password updates, images, products, customers,
orders, stock, and deletes, then removes all generated audit records in a
`finally` cleanup. The command refuses to run when `NODE_ENV=production`.

## Deployment

The root `render.yaml` deploys the API from `backend/`. The EAS `preview` profile creates an installable Android APK; `production` creates an Android App Bundle.

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-API.onrender.com --environment preview --visibility plaintext
npx eas-cli build --platform android --profile preview
```

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) in order. Do not build the company APK before the real API URL is configured, otherwise the installed app will intentionally use standalone local mode.

## Transaction behavior

- The API recalculates prices and totals instead of trusting the device.
- A MongoDB transaction atomically checks/decrements stock, creates the invoice, and updates customer totals.
- Product barcodes and invoice numbers are unique per account.
- A successful cloud invoice clears the cart only after the server transaction succeeds.
- If the API is unreachable, cached company data remains visible but cloud writes fail safely instead of creating unsynced records.
- Cloud registration creates an account only after the 6 digit email code is verified. Registration and password-reset codes expire after 15 minutes.
