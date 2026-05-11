---
sidebar_position: 2
title: Self-Host Laravel + Nova
description: Step-by-step guide to self-hosting the native-update Laravel 11 + Nova 5 backend. Covers env setup, MySQL migrations, queue worker, Firebase token verification, signing keys, FilesHub storage, and the Nova admin panel.
keywords: [native-update laravel self-host, laravel nova ota backend, native-update deploy, firebase token verification laravel, paypal subscription laravel]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Self-Host Laravel + Nova

The `backend/` directory of the `native-update` repository is a complete Laravel 11 + Nova 5 application. It is the same code that powers the hosted SaaS — clone it, deploy it, and you own the full release-management surface. This page walks through the setup end to end. Plan ~90 minutes for a first deploy if you are already comfortable with Laravel; ~half a day if Laravel is new to you.

The work splits into six concerns: PHP and database prerequisites, environment configuration, schema migration, queue workers, the Nova admin panel, and the SDK-facing API. Each one is small in isolation; the order matters.

## What you are deploying

A Laravel 11 application named `Native Update` with:

A PHP 8.2+ web tier handling SDK calls under `/api/v1/*` (API-key auth, rate-limited 600 req / 15 min per key) and dashboard calls under `/api/dashboard/*` (Firebase ID token auth). A MySQL or PostgreSQL database with ~14 tables — users, apps, builds, signing_keys, api_keys, subscriptions, analytics_events, device_activities, and standard Laravel framework tables. A Laravel Nova 5 admin panel mounted at `/admin` for support, billing, and incident response. A queue worker running `php artisan queue:work` to process PayPal webhook handlers and analytics writes. An object-storage backend — FilesHub by default for the SaaS; Google Drive or local disk for self-hosted deployments. A daily log channel under `storage/logs/`.

Skip what you don't need: PayPal subscription support, Google Drive storage, and the License-Management Nova actions are all controllable by env vars. The minimum viable deploy is the web tier plus MySQL plus FilesHub or local disk for bundle storage.

## Prerequisites

You need a server with: PHP 8.2 or 8.3 (with the `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `json`, `mbstring`, `openssl`, `pcre`, `pdo`, `pdo_mysql`, `tokenizer`, `xml`, `zip` extensions), Composer 2.x, Node 20+ for building the front-end assets, MySQL 8.x or PostgreSQL 15+, optional Redis 7.x for cache and queue (recommended in production), a process supervisor such as systemd or Supervisor for the queue worker, and a TLS-terminated reverse proxy (nginx, Caddy, Cloudflare Tunnel). Plus a Firebase project for dashboard authentication, a Laravel Nova license, and a FilesHub account (or substitute Google Drive / local disk).

A single VPS with 2 GB RAM and 2 vCPUs handles low-thousands of MAU comfortably. Scale horizontally by adding web nodes behind a load balancer and switching cache + sessions to Redis.

## Clone, install, build

```bash
git clone <native-update-repo> native-update
cd native-update/backend
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

The `npm run build` step compiles Nova's published assets through Vite. You can skip it if your environment generates these elsewhere, but the Nova admin panel will look unstyled until the manifest appears under `public/build/`.

## Environment configuration

Copy `.env.example` to `.env` and fill in each `[REQUIRED]` block. The file ships with comments explaining every variable's source, format, and where it appears in the relevant vendor dashboard. Walk through it top to bottom rather than picking values out of order — several variables reference others (`APP_URL` feeds `GOOGLE_REDIRECT_URI`, for instance).

The non-obvious ones:

`APP_KEY` is the base64-encoded encryption key Laravel uses for sessions and signed URLs. Generate it once and keep it stable — rotating it invalidates every signed download URL the SDK has cached. Run `php artisan key:generate --force` from a freshly-checked-out copy to produce one.

`CORS_ALLOWED_ORIGINS` is a comma-separated allowlist of origins that may call the API. The default value in `.env.example` covers the SaaS production frontend. Replace it with your own frontend's origin (`https://updates.example.com`) or set it empty in non-production for permissive localhost access through `config/cors.php`'s dev allowlist.

`SERVER_PORT` makes `php artisan serve` bind to a project-specific port without needing `--port` on the command line. The repo ships `SERVER_PORT=5946`. Keep it in sync with `APP_URL` if you change it.

`FIREBASE_CREDENTIALS_PATH` points at a service-account JSON file. Generate one in Firebase Console → Project Settings → Service Accounts → "Generate new private key" and drop it at `storage/firebase-credentials.json`. The middleware uses it to verify ID tokens minted by your dashboard's Firebase Auth instance. Set `FIREBASE_PROJECT_ID` to the same project's ID.

`NATIVE_UPDATE_FIREBASE_AUTO_CREATE` defaults to `true` — any new Firebase UID hitting `/api/dashboard/*` gets a `users` row auto-created. Flip to `false` for invite-only / enterprise deployments where an admin must provision the user in Nova first.

`PAYPAL_*` configures the optional PayPal subscription handling. Skip if you are not selling subscriptions (free / internal deployments). When you do enable it, the plan IDs (`PAYPAL_PLAN_PRO`, `PAYPAL_PLAN_ENTERPRISE`) and the webhook ID (`PAYPAL_WEBHOOK_ID`) must be values from your live PayPal dashboard — sandbox values will silently fail signature verification in production.

`ADMIN_EMAILS` is a comma-separated list of email addresses that should bypass per-tenant scoping in the Nova panel and the `/api/admin/*` routes. Treat this like a master key — anyone on the list can see every customer's data.

## Database schema

The schema has been migration-stable since v3.0.0. Run:

```bash
php artisan migrate --force
```

This creates ~14 tables. Notable ones for operations:

`users` holds dashboard accounts (one row per Firebase UID). It carries `plan`, `mau_limit`, `apps_limit`, `is_suspended`, `is_admin`, `license_key`, `license_expires_at`, `preferences` (JSON), and `paypal_subscription_id`. The `firebase_uid` column is the join key between Firebase Auth and your database.

`apps` is one row per customer app — `user_id`, `name`, `app_id` (the reverse-DNS string), `platforms`, `channels` (JSON arrays), `is_active`. Builds, API keys, and signing keys all FK to `apps.id`.

`builds` is one row per uploaded bundle — `app_id`, `version`, `bundle_id` (UUID), `channel`, `platform`, `storage_provider` (`local` / `s3` / `r2` / `drive` / `fileshub`), `storage_path` (where the ZIP lives), `file_size`, `checksum` (SHA-256 hex), `signature` (base64 RSA-SHA256), `rollout_percentage`, `is_active`, `is_archived`, `mandatory`, `min_native_version`, `release_notes`.

`api_keys` is one row per mobile-app-side API key — `app_id`, `name`, `key_prefix` (first 12 chars, indexed for lookup), `key_hash` (bcrypt of the full key), `type` (`production` / `development`), `rate_limit`, `permissions` (JSON), `revoked_at`, `deprecated_at`, `expires_at`. Full keys are shown ONCE at creation and never persisted in plaintext.

`signing_keys` is one row per app-level signing keypair — `app_id`, `name`, `key_id` (SHA-256 fingerprint), `public_key` (PEM), `private_key_encrypted` (Laravel-encrypted PEM, never exported), `rotated_at`, `revoked_at`. The dashboard exposes a `getPublicKey` endpoint so apps can fetch the current public key at boot if you prefer remote-fetch over compile-time embedding.

`analytics_events` and `device_activities` are the wide append-only event tables. They grow fast — partition or rotate them at 6-month intervals on high-traffic deployments.

## Storage backends

The application supports four storage backends for bundle bytes. Pick at upload time, not deploy time — each Build row carries its own `storage_provider` so you can mix and match.

**FilesHub** (the SaaS default and the canonical choice for self-hosters) is an S3-compatible public CDN with API-key auth. Set `FILESHUB_API_KEY` and `FILESHUB_APP_ID`. Uploads always go in as `visibility: 'public'` — the signed-route gate in front of `/api/v1/bundles/{id}/download` is what enforces authorization, not the storage ACL. See [global FilesHub docs](https://fileshub.zaions.com/ai-integration).

**Google Drive** is the per-user option — each customer connects their own Drive account through OAuth (the `/api/dashboard/google-drive/*` endpoints), and the SaaS uploads bundles to their drive. This is the data-residency option: the bundle bytes stay on the customer's drive even though the metadata is on your server. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

**S3 / R2** are accessible by configuring `AWS_*` variables and pointing the build's `storage_provider` to `s3` or `r2`. Cloudflare R2 with the S3-compatible API is a strong fit — zero egress fees, S3 SDK works out of the box.

**Local disk** is fine for development and small self-hosted deployments. Bundles live under `storage/app/bundles/`. Don't use this on a multi-node deployment unless you have a shared filesystem mount.

## Queue worker

PayPal webhook handling and analytics writes ship through Laravel's queue. The default `QUEUE_CONNECTION=database` requires `php artisan queue:work` to be running, otherwise webhooks pile up in the `jobs` table and the dashboard's subscription view will be stale.

Production setup: run the worker under systemd or Supervisor. A minimal systemd unit:

```ini
# /etc/systemd/system/native-update-queue.service
[Unit]
Description=Native Update Laravel Queue Worker
After=mysql.service

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/native-update/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
WorkingDirectory=/var/www/native-update/backend

[Install]
WantedBy=multi-user.target
```

For higher throughput, switch `QUEUE_CONNECTION=redis` and configure `REDIS_*` variables — Redis-backed queue handles 10x the throughput of database-backed at the same CPU budget. Set `CACHE_STORE=redis` at the same time so rate-limiting on the API runs on Redis too.

## Caching and optimization

After a deploy, prime the framework caches:

```bash
php artisan optimize:clear      # purge anything stale
php artisan config:cache         # serialize .env + config/* into one file
php artisan route:cache          # serialize route definitions
php artisan view:cache           # compile Blade templates
```

Skip the `route:cache` step in development — it breaks `Route::middleware()` lookups for closures. The production deploy zip standard documented in `backend/CLAUDE.md` runs all four.

## Firebase token verification

The dashboard sends Firebase ID tokens in `Authorization: Bearer <token>` headers. `ValidateFirebaseToken` middleware:

1. Pulls the token from the header.
2. Fetches the Firebase public certs (cached for an hour to avoid hammering Google).
3. Verifies the token signature, issuer, audience, and expiry.
4. Looks up or auto-creates the `users` row by `firebase_uid`.
5. Attaches the resolved `User` model to the request.

Most token-rejection failures in production come from clock skew between your server and Firebase's signing infrastructure. Run `chrony` or `systemd-timesyncd`; a drift over 60 seconds will fail every token. The middleware doesn't expose the underlying error reason to the caller — check `storage/logs/laravel.log` for the verification trace.

## Nova admin license

The Nova panel requires a Laravel Nova 5 license. Add to `auth.json`:

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

Re-run `composer install` after adding `auth.json` so Composer can pull the private Nova packages. Set `NOVA_LICENSE_KEY=...` in `.env`; the value gates dashboard access to the `/admin` URL.

## Web server

A minimal nginx site:

```nginx
server {
    listen 443 ssl http2;
    server_name updates.example.com;
    root /var/www/native-update/backend/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/updates.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/updates.example.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

Caddy works equally well and handles TLS automatically. The `php artisan serve` command is intentionally not a production server — use it for `localhost:5946` development only.

## Smoke testing the deploy

After everything is up, run these in order. Each should return `200 OK`.

```bash
# 1. Health check — no auth, cheap.
curl https://updates.example.com/api/health
# → {"status":"ok","app":"Native Update","env":"production","time":"…"}

# 2. Update check with a real API key.
curl https://updates.example.com/api/v1/updates/check \
  -H "X-API-Key: <your-test-key>" \
  -H "X-Device-ID: smoketest-device-1" \
  -H "X-Current-Version: 0.0.0" \
  -H "X-Platform: web"
# → either {"available":false,"message":"No updates available"} or a full
#   update payload if you have already uploaded a bundle for the channel.

# 3. Nova panel.
open https://updates.example.com/admin
# → log in with a Firebase account whose email is in ADMIN_EMAILS
```

If `/api/health` fails, your web server isn't reaching PHP-FPM — check `nginx -t` and `journalctl -u php8.3-fpm`. If health returns `200` but `/api/v1/updates/check` returns `500`, you almost certainly have a missing migration or a broken `FIREBASE_CREDENTIALS_PATH` — `tail -f storage/logs/laravel.log` will tell you which.

## Ongoing operations

The `docs/deployment/PRODUCTION-DEPLOY-CHECKLIST.md` file in the repo carries the full ongoing-ops runbook. The short version: take database backups daily (and test the restore quarterly), monitor `/api/health` from an external uptime check, rotate the queue worker on every deploy (`systemctl restart native-update-queue`), and watch `storage/logs/laravel.log` for `ERROR` entries — most issues surface there first.

## Next steps

- Read [API Contract](./api-contract) to understand the wire format every endpoint speaks.
- Read [Nova Admin Overview](./nova-admin-overview) to learn which Nova resource manages which database table.
- Read [Node + Express Minimal Backend](./node-express-minimal) if you want a contrast — what the same contract looks like with everything stripped out.

The Laravel implementation is dense but consistent: read one controller (e.g. `app/Http/Controllers/Dashboard/AppController.php`) and the rest follow the same pattern.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
