# Smart Billing Release Audit

Audit date: 23 July 2026

## Environment restoration and repair pass

- Recreated ignored root and backend `.env` files from the existing
  `All_In_One_Services/backend/.env` without printing credential values.
- Verified live Atlas connections to the isolated `smart_billing` database and
  the shared `all_in_one_services` authentication database.
- Added `npm run env:restore` so an accidental local `.env` deletion is
  recoverable with the same safe database split.
- Updated Expo SDK 57 packages to the exact versions expected by Expo Doctor.
- Unmounted the camera preview whenever the scanner screen is unfocused, as
  required for tab-based camera usage.
- Made invoice numbers collision-resistant, removed deleted products from the
  cart, surfaced product/customer deletion failures, and added a validated
  development-only image fallback when Cloudinary is unavailable.
- Reverified the live health endpoint with both databases connected and
  confirmed unauthenticated business requests are rejected with HTTP 401.
- Passed a controlled live API chain covering authentication, current-user,
  profile/password updates, image upload, product/customer creation, checkout,
  order retrieval, stock/customer totals, and deletes; all generated audit
  records were removed by the test cleanup.

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
- Split persistence into two databases: existing ServiceHub `all_in_one_services.users` for shared authentication, and separate `smart_billing` for all billing-owned collections.
- Added Brevo transactional-email API support and verified the supplied API key plus one real test reset-code email.
- Rebuilt authentication as two complete OTP flows: registration request/verify/login and forgot-password request/verify/reset/login, with resend, confirmation fields, success state, and longer email-request timeout.

## Verification results

- ESLint: 0 errors.
- Expo Doctor: 20/20 checks passed.
- Android, iOS, and Web production Metro exports: passed.
- App billing/stock/analytics tests: 6/6 passed.
- Backend calculation/API/security/environment/image-fallback tests: 12/12 passed.
- Backend production dependency audit: 0 vulnerabilities.
- Live controlled auth-chain verification: registration request 200, verification 201, initial login 200, password reset 200, old password rejected, new password login 200; temporary test account removed.
- Root audit reports 11 moderate advisories through Expo CLI → xcode → uuid. npm's automated suggestion downgrades Expo to SDK 46, so it was rejected as incompatible. This is build tooling and should be monitored with Expo SDK 57 updates.

## External deployment blockers found

- EAS CLI status: not logged in.
- No Git repository or remote was originally present; a local release baseline must be pushed to the company's private repository.
- No Render CLI/API credentials were present.
- Production Cloudinary, CORS origin, API hostname, and privacy-policy URL are
  still company-owned values that were not available locally.
- Local MongoDB Atlas and Brevo development credentials are configured in
  ignored `.env` files. Product images use an embedded fallback only in local
  development; production startup still requires Cloudinary.
- The supplied ServiceHub admin email exists, but the supplied admin password does not match its current bcrypt hash. No account password was changed; use the current website password or reset it through the owning ServiceHub flow.
- Shared authentication keeps ServiceHub accounts compatible while the separate billing database prevents product/order/customer schema collisions. The ServiceHub website must explicitly connect to `smart_billing` if billing records need to appear in its UI.
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
