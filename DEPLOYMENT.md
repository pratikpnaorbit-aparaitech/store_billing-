# Production Deployment Runbook

## 1. Company accounts and services

Prepare a private Git repository, MongoDB Atlas database, Cloudinary account, SMTP mailbox/provider, Render account, and Expo/EAS organization account. Use company-owned accounts, not personal credentials.

Before the first store build, confirm that `com.smartbilling.scanner` is owned by the company and replace/approve the starter `LICENSE` notice.

## 2. Backend deployment

1. Push this repository to the company Git host.
2. In Render, create a Blueprint from the root `render.yaml`.
3. Enter every `sync: false` value when prompted: `MONGODB_URI`, `CORS_ORIGINS`, Cloudinary credentials, and SMTP credentials. Render generates `JWT_SECRET`.
4. Confirm the deploy is healthy at `https://YOUR-SERVICE.onrender.com/health`; `database` must be `connected`.
5. Keep MongoDB network access restricted as far as the hosting architecture allows and enable database backups.

## 3. EAS configuration

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-SERVICE.onrender.com --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-SERVICE.onrender.com --environment production --visibility plaintext
```

Commit the `extra.eas.projectId` produced by `eas init`. `EXPO_PUBLIC_API_URL` is a public endpoint, not a secret.

## 4. Internal APK

```bash
npx eas-cli build --platform android --profile preview
```

Install the downloaded APK on at least two supported Android devices and complete every physical-device acceptance item in `AUDIT.md`.

## 5. Store release

After company sign-off, host the reviewed privacy policy on a public HTTPS URL, create Play Console listing/data-safety answers, then build the signed AAB:

```bash
npx eas-cli build --platform android --profile production
```

Use staged/internal Play testing before production rollout. Keep the EAS keystore and Play signing ownership in the company organization.

## Rollback

Render retains the previous successful deploy when a new build fails. For application rollback, promote the last approved build in Play Console/EAS. Database changes in this release are additive, but database backups are still required before deployment.
