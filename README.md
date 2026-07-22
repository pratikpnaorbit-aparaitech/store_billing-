# Smart Billing

Production-oriented Expo SDK 57 billing app for stores. It includes account authentication, tenant-isolated products/customers/orders, barcode scanning, stock-aware cart billing, GST and discounts, PDF receipts, password recovery, reports, and offline read-only cache when the cloud API is temporarily unavailable.

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

## Backend

```bash
cd backend
npm ci
# Create backend/.env from backend/.env.example
npm start
```

Production startup validates MongoDB, JWT, CORS, Cloudinary, and SMTP configuration before accepting traffic. All business routes require a JWT and every query is scoped to the authenticated account.

## Verification

```bash
npm run check
npx expo export --platform all --output-dir native-dist
cd backend
npm test
npm audit --omit=dev
```

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
