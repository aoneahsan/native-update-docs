---
sidebar_position: 1
title: Backend — Overview
description: native-update needs a backend that serves bundle metadata and the bundle ZIP. You have three choices — the hosted SaaS, the Laravel + Nova reference implementation, or a minimal Node/Express server. This page helps you pick.
keywords: [native-update backend, capacitor ota backend, laravel nova native update, hosted ota saas, self-hosted ota server]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Backend — Overview

`native-update` needs a backend that the device-side SDK can call. The contract is small — one update-check endpoint, one bundle-download endpoint, and a handful of analytics writes — but you still have to pick where it runs and who owns the data. This page lays out the three deployment options and the trade-offs between them so you can pick before you read the rest of this section.

## What the backend actually does

The device-side SDK never holds release state. It asks the backend two questions: "is there a newer bundle for me?" and "give me the bytes." Everything else — which bundle is current per channel, which devices are eligible, who signed it, how many devices downloaded it — lives on the server.

The full HTTP contract is documented on the [API Contract](./api-contract) page. At minimum a backend must serve:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/updates/check` | `GET` | Returns whether an update is available and a signed download URL if so. |
| `/api/v1/bundles/{id}/download` | `GET` | Streams the bundle ZIP to the device. Authenticated via the signed URL the check endpoint returned. |
| `/api/v1/analytics/mau` | `POST` | Records that a device was active today. Drives MAU billing on the hosted SaaS. |
| `/api/v1/analytics/download` | `POST` | Records bundle download success or failure. |
| `/api/v1/analytics/install` | `POST` | Records install success, failure, or rollback. |
| `/api/health` | `GET` | Cheap uptime ping. Returns `{status: "ok"}`. |

Anything beyond that — admin dashboard, signing-key rotation, rollout percentage, license enforcement, billing — is a feature of the backend you choose to run. The Laravel reference implementation has all of it; the minimal Node/Express scaffold has none of it.

## The three options

You have three deployment paths. They are not exclusive — many teams start on the hosted SaaS, move to self-hosted Laravel when their data-residency or cost picture changes, and keep the Node/Express server in their test environment.

### Option A — Hosted Native Update SaaS

Sign up at [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com), create an app, paste the resulting API key into your `native-update.config.js`, and upload bundles through the dashboard or the CLI. Zero servers to operate. Pricing tiers track MAU + apps + features (see the pricing page on the marketing site). This is the path of least resistance for teams that want OTA updates working in an afternoon without taking on backend operations.

What you get: the dashboard, signed downloads, analytics, signing-key rotation, rollout percentage, Firebase-Auth login for the dashboard, role-based access, MAU-based billing, audit logs. What you lose: the bundle bytes live on the SaaS provider's storage (Google Drive of the SaaS account by default; FilesHub-backed S3-compatible storage on higher tiers), and you don't operate the database.

The SaaS is the same Laravel + Nova application documented in [Self-Host Laravel + Nova](./laravel-nova-self-host) — running on managed infrastructure. The API contract is byte-for-byte identical, so a future migration to self-hosted is a configuration change in your app (`serverUrl: 'https://your-backend.example.com'`), not a code rewrite.

### Option B — Self-host Laravel + Nova (full reference)

Clone the `backend/` directory of the `native-update` repository and deploy it to your own server. You operate Laravel 11, MySQL or PostgreSQL, optionally Redis, optionally a queue worker. You own every byte of customer data and every CPU cycle. The dashboard, Nova admin panel, PayPal subscription handling, Google Drive storage integration, FilesHub integration, MAU enforcement, and audit logs all ship in the same codebase — flip a few env vars to disable the bits you don't need.

This is the option for: regulated industries with data-residency rules; teams who want to fork and customise the admin; teams who already operate Laravel apps and prefer one stack; cost-sensitive deployments with `>` 10k MAU where the hosted SaaS tier price exceeds VPS + DB hosting.

It is not the option for: side projects that just want OTA working in an hour, or teams without a sysadmin or DevOps capability. Operating Laravel in production is a real ongoing commitment — TLS certs, database backups, log rotation, queue worker supervisor scripts, security updates.

Full setup is documented in [Self-Host Laravel + Nova](./laravel-nova-self-host).

### Option C — Roll your own minimal backend

The HTTP contract is small enough that you can write a working backend in a single Express, Hono, Fastify, FastAPI, or Go-net/http file. The repo ships [`example-apps/node-express/`](./node-express-minimal) as a fully-working ~160-line reference. It implements the four endpoints, persists bundle metadata in a JSON file, and serves uploads with `multer`. It is intentionally simple: no auth, no signing, no rollout, no dashboard.

You would pick this when you want full control over storage, auth, and observability — for example, when the OTA backend lives inside an existing service that already handles user auth and storage, and the team prefers an extra route over running a second application. The trade-off is that every feature you want beyond the bare contract — signing-key rotation, percentage rollouts, MAU billing, analytics dashboards, admin UI — you build yourself. The Laravel reference implementation is ~25k lines of PHP for a reason.

## How to choose

The simplest question to ask: "do I want to operate a server?"

| If you answered… | Pick |
|---|---|
| "No, I just want OTA working." | **Hosted SaaS** (Option A). |
| "Yes, and I already run Laravel apps." | **Self-host Laravel + Nova** (Option B). |
| "Yes, and I want to write the minimum code in my preferred language." | **Roll your own**, starting from [`node-express-minimal`](./node-express-minimal) (Option C) or the [`backend create`](/reference/cli/backend-create) CLI scaffold. |
| "Yes for production, but I need something quick for my local dev / E2E tests." | **`native-update server start`** (a separate tiny dev server, not a backend) for local plus any of the three for production. |

Migration between any two options is a single config change in your app (`serverUrl`) — the contract is identical.

## What stays the same regardless of backend

Every backend that claims to implement this contract honours the same conventions, because the device-side SDK encodes them in its parser. If you write your own, copy these behaviours exactly:

The update check endpoint returns `{available: false, message: "..."}` when there is nothing to ship, never `404` or `null`. The check returns `200` even when no update is available — clients distinguish "no update" from "endpoint broken" by the response body, not by status. When an update IS available, the response carries `version`, `bundleId`, `downloadUrl`, `checksum`, `signature`, `size`, `mandatory`, `releaseNotes`, `minNativeVersion`, `expiresAt` — all required for the SDK to verify and apply the bundle.

The download URL must be short-lived and unguessable. The Laravel reference uses Laravel's signed routes with a 30-minute default TTL (`NATIVE_UPDATE_DOWNLOAD_URL_TTL_MINUTES`); your own implementation should use HMAC-signed query strings or pre-signed S3 URLs. Static `/bundles/<filename>` paths are fine for local dev only, never for production.

Authentication uses an opaque API key passed via the `X-API-Key` header. The Laravel reference scopes every key to a single app, rate-limits per key (default 600 requests / 15 min), and supports per-key revocation and deprecation. Your own implementation should at minimum scope keys to an app and rotate them.

Analytics are write-only and fire-and-forget from the device's perspective. A failed analytics POST never blocks a download or install — the SDK swallows the error and continues. Your endpoint can return `202 Accepted` or `200 {success: true}` as long as it returns quickly.

## Next steps

- If you picked the **hosted SaaS**: skip the rest of this section and read [Quick Start](/getting-started/quick-start).
- If you picked **self-hosted Laravel**: read [Self-Host Laravel + Nova](./laravel-nova-self-host) for the env-by-env setup, then [API Contract](./api-contract) to learn the wire format, then [Nova Admin Overview](./nova-admin-overview) to learn the admin UI.
- If you picked **a minimal custom backend**: read [Node + Express Minimal Backend](./node-express-minimal) for the reference implementation, then [API Contract](./api-contract) to fill in everything it doesn't do.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
