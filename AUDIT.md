# Smart Billing Release Audit

Audit date: 22 July 2026

## Completed

- Expo SDK 57 dependencies, Android/iOS identifiers, permission text, adaptive icons, EAS preview APK, and production profiles.
- Registration/login/session restore, secure native token storage, profile/password change, email reset code, and logout.
- Authenticated multi-tenant API: products, customers, orders, and images are isolated by account.
- Server-authoritative pricing and atomic MongoDB checkout with stock protection and customer statistics.
- Product create/edit/delete, unique barcode enforcement, gallery image upload, and barcode draft preservation.
- Stock-aware cart, GST/discount/payment selection, stable invoice, PDF share/print, order history, dashboard, and reports.
- Cloud-first stores with read-only local cache during API outages; no silent offline writes in company cloud mode.
- Helmet security headers, rate limiting, explicit production CORS, password hashing, JWT issuer validation, graceful shutdown, health endpoint, Dockerfile, and Render Blueprint.
- Environment validation, lint configuration, unit/API/security tests, and deployment documentation.
- Connected read-only to the shared `all_in_one_services` database, verified 32 bcrypt-based ServiceHub accounts, and made the billing auth model compatible with the existing `users.password` field.
- Isolated new billing records into `billing_products`, `billing_customers`, and `billing_orders` inside the shared database to prevent collection/schema collisions.
- Added Brevo transactional-email API support and verified the supplied API key plus one real test reset-code email.

## Verification results

- ESLint: 0 errors.
- Expo Doctor: 20/20 checks passed.
- Android, iOS, and Web production Metro exports: passed.
- App billing/stock/analytics tests: 6/6 passed.
- Backend calculation/API/security/environment tests: 10/10 passed.
- Backend production dependency audit: 0 vulnerabilities.
- Root audit reports 11 moderate advisories through Expo CLI → xcode → uuid. npm's automated suggestion downgrades Expo to SDK 46, so it was rejected as incompatible. This is build tooling and should be monitored with Expo SDK 57 updates.

## External deployment blockers found

- EAS CLI status: not logged in.
- No Git repository or remote was originally present; a local release baseline must be pushed to the company's private repository.
- No Render CLI/API credentials were present.
- Production MongoDB Atlas, Cloudinary, SMTP, CORS origin, API hostname, and privacy-policy URL are company-owned values and were not available locally.
- Local MongoDB Atlas and Brevo development credentials are now configured in ignored `.env` files. Production Render configuration and Cloudinary credentials are still required.
- The supplied ServiceHub admin email exists, but the supplied admin password does not match its current bcrypt hash. No account password was changed; use the current website password or reset it through the owning ServiceHub flow.
- Sharing the database makes accounts compatible and keeps billing collections in the same database. The ServiceHub website must explicitly read the `billing_*` collections if billing records need to appear in its UI.
- The Android package/bundle identifier `com.smartbilling.scanner` must be confirmed as company-owned and unique before Play Console creation.
- The current `LICENSE` came from the Expo starter and names Expo's copyright; company legal/engineering must replace or approve the application's final licensing notice.
- Docker is not installed, so the included image could not be built locally; Render can build from `backend/Dockerfile` or the native Node Blueprint.

## Physical-device acceptance still required

- Scan the company's actual EAN/UPC/Code 128 labels under store lighting.
- Verify camera/gallery permission prompts and product photo upload.
- Complete Cash, UPI, and Card invoices; confirm stock and customer totals across two logged-in devices.
- Verify PDF rendering/share sheet and the selected thermal printer's real transport/SDK.
- Test API outage behavior and password-reset email delivery.

Direct Bluetooth/USB thermal-printer transport remains hardware-specific. The app currently provides PDF printing and a thermal text preview; choosing a printer SDK requires the actual printer model.
