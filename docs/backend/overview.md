---
sidebar_position: 1
title: Backend — Overview
description: native-update needs a backend that serves bundle metadata and the bundle ZIP. Use the hosted Native Update service, or your own server that implements the documented contract. This page helps you pick.
keywords: [native-update backend, capacitor ota backend, hosted ota service, custom ota server, native-update api contract]
last_update:
  date: 2026-05-11
  author: Native Update team
---

# Backend — Overview

`native-update` needs a backend that the device-side SDK can call. The contract is small — one update-check endpoint, one bundle-download endpoint, and a handful of analytics writes — but you still have to pick where it runs and who owns the data. This page lays out the two options and the trade-offs between them so you can pick before you read the rest of this section.

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

Anything beyond that — dashboard, signing-key rotation, rollout percentage, billing — is a feature of the backend you choose. The hosted Native Update service has all of it; the minimal Node/Express starter has none of it.

## The two options

You have two paths, and they aren't exclusive: many teams use the hosted service in production and a small server of their own for local tests.

### Option A — The hosted Native Update service

Sign up at [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com), create an app, paste the resulting API key into your `native-update.config.js`, and upload bundles through the dashboard or the CLI. There are no servers to operate. Plans are listed on the pricing page of that site. This is the shortest path for teams that want OTA updates working in an afternoon without taking on backend operations.

What you get: the dashboard, signed downloads, analytics, signing-key rotation, rollout percentage, Google sign-in for the dashboard, role-based access and audit logs. The Native Update team operates the service, its database and the bundle storage. The hosted API is at `https://nativeupdatebe.aoneahsan.com`.

### Option B — Your own server that implements the contract

The HTTP contract is small enough that you can write a working backend in a single Express, Hono, Fastify, FastAPI, or Go-net/http file. [Node + Express Minimal Backend](./node-express-minimal) walks through a working ~160-line starter, and the [`backend create`](/reference/cli/backend-create) CLI command scaffolds one. The starter implements the endpoints, persists bundle metadata in a JSON file, and serves uploads with `multer`. It's intentionally simple: no auth, no signing, no rollout, no dashboard.

You'd pick this when you want full control over storage, auth, and observability — for example, when the OTA backend lives inside an existing service that already handles user auth and storage. The trade-off is that every feature beyond the bare contract — signing-key rotation, percentage rollouts, analytics dashboards, admin UI — you build yourself.

## How to choose

The simplest question to ask: "do I want to operate a server?"

| If you answered… | Pick |
|---|---|
| "No, I just want OTA working." | **The hosted service** (Option A). |
| "Yes, and I want to write the minimum code in my preferred language." | **Your own server**, starting from [`node-express-minimal`](./node-express-minimal) or the [`backend create`](/reference/cli/backend-create) CLI scaffold (Option B). |
| "I need something quick for my local dev / E2E tests." | **`native-update server start`** (a separate tiny dev server, not a backend) for local, plus either option for production. |

Moving between the two is a single config change in your app (`serverUrl`) — the contract is the same.

## What stays the same regardless of backend

Every backend that claims to implement this contract honours the same conventions, because the device-side SDK encodes them in its parser. If you write your own, copy these behaviours exactly:

The update check endpoint returns `{available: false, message: "..."}` when there is nothing to ship, never `404` or `null`. The check returns `200` even when no update is available — clients distinguish "no update" from "endpoint broken" by the response body, not by status. When an update IS available, the response carries `version`, `bundleId`, `downloadUrl`, `checksum`, `signature`, `signatureAlgorithm`, `size`, `mandatory`, `releaseNotes`, `minNativeVersion`, `expiresAt`, plus optional `NUDELTA/1` patch metadata — the full URL always remains available as a fallback.

The download URL must be short-lived and unguessable. The hosted service uses signed URLs with a 30-minute default lifetime; your own implementation should use HMAC-signed query strings or pre-signed S3 URLs. Static `/bundles/<filename>` paths are fine for local dev only, never for production.

Authentication uses an opaque API key passed via the `X-API-Key` header. The hosted service scopes every key to a single app, rate-limits per key (default 600 requests / 15 min), and supports per-key revocation and deprecation. Your own implementation should at minimum scope keys to an app and rotate them.

Analytics are write-only and fire-and-forget from the device's perspective. A failed analytics POST never blocks a download or install — the SDK swallows the error and continues. Your endpoint can return `202 Accepted` or `200 {success: true}` as long as it returns quickly.

## Next steps

- If you picked the **hosted service**: skip the rest of this section and read [Quick Start](/getting-started/quick-start).
- If you picked **your own server**: read [Node + Express Minimal Backend](./node-express-minimal) for the reference implementation, then [API Contract](./api-contract) to fill in everything it doesn't do.

## Maintained by

The [Native Update team](/about) maintains `native-update` and this page.
