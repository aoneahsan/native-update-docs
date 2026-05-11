---
sidebar_position: 2
title: Backend-first walkthrough — self-hosted Laravel
description: A step-by-step walkthrough from a fresh Laravel + Nova clone to the first device successfully calling /api/v1/updates/check. Covers env setup, migrations, queue worker, Nova admin login, creating the first App + API key + signing key, and uploading the first build.
keywords: [native-update laravel walkthrough, self-hosted ota tutorial, native-update nova first app, laravel ota api setup, native-update backend tutorial]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Backend-first walkthrough — self-hosted Laravel

This tutorial walks through standing up the `backend/` Laravel application from the `native-update` repository and proving end-to-end connectivity: from a freshly-cloned repo to a real device hitting `/api/v1/updates/check` against your own server. Plan ~60 minutes if you are comfortable with Laravel and already have PHP installed locally, ~90 minutes from a clean machine.

Use this when you want to own the database and bundle storage rather than relying on the hosted SaaS. The wire contract is identical between the two, so anything you build against this backend works against the SaaS without code changes.

## What you will have at the end

A running Laravel 11 + Nova 5 instance on `http://localhost:5946`, a MySQL database with the schema migrated, a queue worker processing webhooks, a Nova admin panel logged in with your Firebase account, and an `App` + `ApiKey` + `SigningKey` + first `Build` row visible — with `/api/v1/updates/check` returning a real bundle to a device.

You need: PHP 8.2 or 8.3, Composer 2.x, Node 20+, MySQL 8.x or PostgreSQL 15+, a Firebase project with Email/Password auth enabled, and a Laravel Nova license (or a 14-day trial).

## Step 1 — Clone and install

```bash
git clone <native-update-repo> native-update
cd native-update/backend
composer install
npm ci
npm run build
```

The `npm run build` step compiles Nova's published assets via Vite. Skipping it leaves the admin panel unstyled.

If `composer install` fails on the Nova package, you don't have a Nova license configured. Add `auth.json` to the `backend/` directory:

```json
{
  "http-basic": {
    "nova.laravel.com": {
      "username": "your-nova-email",
      "password": "your-nova-license-key"
    }
  }
}
```

Re-run `composer install`.

## Step 2 — Create the database

```bash
mysql -u root -p
> CREATE DATABASE native_update_dev;
> CREATE USER 'native_update'@'localhost' IDENTIFIED BY 'devpass';
> GRANT ALL ON native_update_dev.* TO 'native_update'@'localhost';
> \q
```

PostgreSQL works equally well — `psql` and `createdb` instead of the above.

## Step 3 — Environment configuration

```bash
cp .env.example .env
php artisan key:generate --force
```

Open `.env` and fill in the required blocks. Start with the database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=native_update_dev
DB_USERNAME=native_update
DB_PASSWORD=devpass
```

Then Firebase. Go to your Firebase project → Settings → Service Accounts → Generate new private key. Save the file to `backend/storage/firebase-credentials.json`:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS_PATH=storage/firebase-credentials.json
```

Set the admin allowlist to your own email:

```env
ADMIN_EMAILS=you@example.com
```

For development, leave `FILESHUB_*`, `GOOGLE_*`, and `PAYPAL_*` blank — they only activate when the features they gate are used. The minimum viable backend works without them.

`SERVER_PORT=5946` is already in `.env.example`. Keep it.

## Step 4 — Migrate the schema

```bash
php artisan migrate --force
```

You should see ~21 migrations execute. The result is ~14 tables: `users`, `apps`, `builds`, `signing_keys`, `api_keys`, `subscriptions`, `analytics_events`, `device_activities`, plus the standard Laravel framework tables (`cache`, `jobs`, `sessions`).

Sanity-check:

```bash
mysql -u native_update -p native_update_dev -e "SHOW TABLES;"
```

## Step 5 — Optimise + start the server

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan serve
```

Open a second terminal for the queue worker:

```bash
php artisan queue:work --sleep=3 --tries=3
```

The queue worker has to run; without it, PayPal webhooks and async writes pile up in the `jobs` table. For local development this terminal stays open; for production you wire it into systemd or Supervisor (see [Self-host Laravel + Nova](/backend/laravel-nova-self-host)).

Smoke-test the API:

```bash
curl http://localhost:5946/api/health
# {"status":"ok","app":"Native Update","env":"local","time":"…"}
```

If you see `{"status":"ok"}`, the web tier + DB are healthy.

## Step 6 — Sign in to Nova

Open `http://localhost:5946/admin` in your browser. Nova prompts for a Firebase ID token — your dashboard's web frontend handles this in production. For first-time local setup, the easiest path is to seed an admin user manually:

```bash
php artisan tinker
> $u = \App\Models\User::create([
    'firebase_uid' => 'firebase-uid-of-your-account',
    'email' => 'you@example.com',
    'name' => 'You',
    'plan' => 'enterprise',
    'is_admin' => true,
  ]);
> exit
```

(In production, the dashboard's Firebase Auth flow auto-creates the row on first login.)

You can now reach Nova at `http://localhost:5946/admin` with a Firebase token from your dashboard. The Nova panel shows Users, Apps, Builds, ApiKeys, SigningKeys.

## Step 7 — Create your first app

In Nova: **Apps → New App**. Fill in:

- User: yourself (the dropdown is scoped to admins; you see all users).
- Name: `My Dev App`
- App ID: `com.example.myapp`
- Platforms: `["ios","android"]`
- Channels: `["production","staging"]`

Save. Nova creates the row and routes you back to the index.

## Step 8 — Create an API key

In Nova: open your app → **API Keys** relationship → **Add API Key**:

- Name: `Local development`
- Type: `development`
- Rate Limit: `600`

Save. The next page shows the full API key string ONCE — copy it. Subsequent visits only show the prefix. Format: `nu_dev_<random>`.

## Step 9 — Upload your signing public key

Generate a keypair if you don't have one:

```bash
cd <your-app-project>
npx native-update keys generate --type rsa --size 4096
```

In Nova: open your app → **Signing Keys** relationship → **Add Signing Key**:

- Name: `Local 2026 Q2`
- Public Key: paste contents of `public-<timestamp>.pem`

Save. Nova stores the public key. The private key stays on your machine.

## Step 10 — Wire your app to your local backend

In your Capacitor app's `native-update.config.js`:

```js
export default {
  appId: 'com.example.myapp',
  serverUrl: 'http://10.0.2.2:5946',   // Android emulator → host machine
  // serverUrl: 'http://localhost:5946', // iOS Simulator on macOS
  // serverUrl: 'http://192.168.1.x:5946', // Real device on the same LAN
  channel: 'production',
  apiKey: 'nu_dev_xxxxxxxxxxxxxxxxxxxxxx',
  publicKey: `-----BEGIN PUBLIC KEY-----
... public key contents ...
-----END PUBLIC KEY-----`,
};
```

For a real Android device, you also need to allow cleartext to your LAN — see [Android Platform Guide → Network security configuration](/platforms/android#network-security-configuration). Production should be HTTPS.

## Step 11 — Bundle, sign, upload

```bash
yarn build
npx native-update bundle create ./dist --version 1.0.0 --channel production
npx native-update bundle sign  ./update-bundles/bundle-1.0.0-*.zip \
  --key ./keys/private-*.pem
```

In Nova: open your app → **Builds** → **New Build**. Drop the `.signed.zip` (or upload via the bundled REST endpoint — see [API Contract](/backend/api-contract)). Set version `1.0.0`, channel `production`, mark `is_active: true`.

## Step 12 — Verify the device-side sync

Build and run your Capacitor app. Watch logs:

- Android: `adb logcat | grep native-update`
- iOS: Console.app filtered on `native-update`

You should see the SDK call `http://10.0.2.2:5946/api/v1/updates/check`, the backend respond with a signed download URL, the device fetch the bundle from a Laravel signed route, verify the SHA-256 + RSA-SHA256 signature against your public key, mark the bundle pending, and apply on next launch.

The full trace, from the Laravel side: `tail -f storage/logs/laravel.log` shows the API key resolved, device activity recorded, bundle row matched, and signed URL minted with a 30-minute TTL (configurable via `NATIVE_UPDATE_DOWNLOAD_URL_TTL_MINUTES`).

## Step 13 — Confirm in Nova

Open Nova → Builds → click your `1.0.0` row. The counters now show:

- Downloads: 1 (or more if the SDK retried)
- Installs: 1 (after the device applied the bundle)
- Rollbacks: 0 (unless the bundle crashed)

The Build row also carries a `last_downloaded_at` timestamp.

That's the full backend-first loop. From here you can replicate Steps 7–12 for every customer / app on the SaaS — Nova handles tenant scoping automatically (each customer sees only their own apps thanks to `AppPolicy`).

## What you skipped

This walkthrough used Nova's UI for App + ApiKey + Build creation. In production, the dashboard's React frontend hits the `/api/dashboard/*` endpoints to do the same work programmatically — see [Backend → API Contract](/backend/api-contract) for the wire format. You also skipped FilesHub / Google Drive / S3 storage and ran on local-disk storage — see [Backend → Self-host Laravel + Nova](/backend/laravel-nova-self-host) for the storage-backend cookbook.

## Next steps

- [API Contract](/backend/api-contract) — the wire format you just exercised.
- [Nova Admin Overview](/backend/nova-admin-overview) — every Nova resource explained.
- [How-to: Integrate with CI/CD](/how-to/ci-cd-github-actions) — automate the bundle/sign/upload steps.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
