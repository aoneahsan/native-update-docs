---
sidebar_position: 4
title: API Contract
description: The exact HTTP contract every native-update backend must satisfy. Six endpoints, full request and response shapes, authentication, status codes, error envelopes, and the field semantics the SDK enforces.
keywords: [native-update api contract, capacitor ota api spec, native-update http endpoints, native-update signed url, native-update api key auth]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# API Contract

This page is the wire-format reference. It documents every endpoint the SDK calls, the headers it sends, the response shapes it expects, the error envelopes it tolerates, and the field-by-field semantics. Match this contract and any backend works — the hosted SaaS, the Laravel reference, the Express example, and your own custom server are all interchangeable behind the same `serverUrl`.

The contract is small but exact: deviating from a field name silently breaks the SDK's parsing, and the SDK does not log helpful errors for malformed responses. Read this page in full before writing or auditing a backend.

## Conventions

All endpoints are JSON over HTTPS. HTTP-only is fine for local dev, but never in production — the SDK refuses bundle downloads from non-HTTPS URLs on iOS (App Transport Security) and emits a warning on Android.

The base URL is the `serverUrl` in your `native-update.config.js`. Paths in this document are relative to that base. The hosted SaaS uses `https://nativeupdatebe.aoneahsan.com`; replace with your own.

Successful responses use `200 OK` even when there is no update — the SDK distinguishes "no update" from "endpoint broken" by the response body's `available` flag, not by HTTP status. Reserve `4xx` and `5xx` for actual failures.

All timestamps are ISO 8601 with timezone (`2026-05-11T12:34:56.000Z`). Don't ship Unix epochs — the SDK parses ISO strings only.

## Authentication

Two auth schemes ride on different paths:

| Path prefix | Auth | Use |
|---|---|---|
| `/api/v1/*` | `X-API-Key: <key>` header | Mobile-app-side endpoints called by the SDK. |
| `/api/v1/bundles/{id}/download` | Signed URL query string (no header) | Bundle download. The signed URL is returned by `/api/v1/updates/check`. |
| `/api/dashboard/*` | `Authorization: Bearer <firebase-id-token>` | Web dashboard endpoints called by the operator's browser. |
| `/api/admin/*` | `Authorization: Bearer <firebase-id-token>` plus admin claim | Cross-tenant admin operations. |

The SDK only talks to `/api/v1/*` and the signed download URL. The dashboard / admin endpoints are out of scope for an SDK-only backend; only implement them if you are also building the dashboard.

### API key requirements

An API key is an opaque string the SDK sends as `X-API-Key`. The Laravel reference enforces:

A key is scoped to exactly one app. The middleware looks up `apps.api_keys` by the key's first 12 characters (`key_prefix`), then bcrypt-verifies the full key against `key_hash`. The resolved `App` is attached to the request — every downstream handler queries by `$app->id`, never trusting client-supplied app IDs.

A key has a `rate_limit` (default 600 requests / 15 minutes). When exceeded, the middleware returns `429 Too Many Requests` with a `Retry-After` header. Defense-in-depth: route-level `throttle:600,15` runs before the middleware too, so a leaked key still hits the per-IP ceiling.

A key can be `revoked` (immediate reject) or `deprecated` (logged warning + still works) or expired (`expires_at` < now). Revocation is the panic button when a key leaks; deprecation is the soft-migration tool when you rotate keys.

Custom backends should match this behaviour. Don't store keys in plaintext; don't ship the same key with `production` and `development` builds; don't let one tenant's key authenticate against another tenant's bundles.

## Endpoint: `GET /api/health`

The cheap uptime check. No auth. Used by external uptime monitors and post-deploy smoke tests.

**Request:** none beyond the URL.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "app": "Native Update",
  "env": "production",
  "time": "2026-05-11T12:34:56.000Z"
}
```

All four fields are optional in custom backends — the SDK never reads this endpoint, only your monitoring does. Return whatever helps you debug a wedged deploy.

## Endpoint: `GET /api/v1/updates/check`

The endpoint the SDK calls on every `sync()` or `checkForUpdate()`. The most important endpoint in the whole contract.

**Headers (required from the SDK):**

| Header | Required | Notes |
|---|---|---|
| `X-API-Key` | Yes | Identifies the app. Returns `401` if missing or invalid. |
| `X-Device-ID` | Yes | An opaque, stable device identifier (the SDK hashes the platform device ID). Used for MAU + rollout. Returns `400 MISSING_DEVICE_ID` if missing. |
| `X-Current-Version` | Yes | The bundle version currently active on the device. The server short-circuits when `current_version == latest.version`. |
| `X-Platform` | Yes | `ios` / `android` / `web` / `all`. Used for platform-filtered builds. |
| `X-App-Version` | No | The native app-store binary version (e.g. `1.4.0`). Drives the `minNativeVersion` gate. |

**Query string:**

| Param | Required | Notes |
|---|---|---|
| `channel` | No | Defaults to `production`. The SDK passes the channel from `config.channel`. |

**Response (no update):** `200 OK`

```json
{
  "available": false,
  "message": "No updates available"
}
```

The SDK accepts any of these `message` values; it only checks `available`. Reasons the server emits a "no update" response:

- No build for the channel.
- The device hash is not in the rollout percentage.
- The current version already matches the latest.
- The bundle's platform field doesn't include the device's platform.
- The `min_native_version` requires a newer store build.

**Response (update available):** `200 OK`

```json
{
  "available": true,
  "version": "1.4.0",
  "bundleId": "0193abcd-ef01-7000-8000-aaaaaaaaaaaa",
  "downloadUrl": "https://updates.example.com/api/v1/bundles/42/download?signature=…&expires=…",
  "checksum": "5f3a…b8d1",
  "signature": "AbCdEf…==",
  "size": 1843921,
  "mandatory": false,
  "releaseNotes": "Bug fixes for the cart page.",
  "minNativeVersion": "1.0.0",
  "expiresAt": "2026-05-11T13:04:56.000Z"
}
```

Field semantics:

`version` (string, required) — the bundle's SemVer string. The SDK uses it to set `current_version` after a successful install, so it must round-trip identically.

`bundleId` (string, required) — the bundle's UUID. The analytics endpoints key off this. The Laravel reference generates UUIDv7 — any UUID works, but it must be stable per bundle and unique across all bundles.

`downloadUrl` (string, required) — absolute URL. **Cannot be a relative path.** The SDK opens it directly. Must be short-lived in production; the SDK does not refresh it.

`checksum` (string, required for signature verification) — SHA-256 of the bundle ZIP, hex-encoded lowercase. The SDK re-hashes the downloaded ZIP and refuses to apply if the hashes don't match.

`signature` (string, required for signed bundles) — RSA-SHA256 over the bundle bytes, base64-encoded. The SDK verifies against the public key compiled into the app via `native-update.config.js`'s `publicKey` field. Optional only if you ship without signature verification (not recommended).

`size` (number, required) — bytes. Drives the download progress callback's percentage.

`mandatory` (boolean, optional) — when `true`, the SDK applies the bundle on the next app launch without prompting the user. Default `false`.

`releaseNotes` (string, optional) — human-readable string. Free-form; the SDK passes it through to your in-app update prompt as-is.

`minNativeVersion` (string, optional) — when set, the SDK compares it against `X-App-Version` and aborts if the device's store binary is older. Lets you ship JS that depends on native code from a newer store release.

`expiresAt` (string, ISO 8601, optional) — the `downloadUrl` expiry timestamp. Purely informational from the SDK's side — the server enforces expiry, the SDK just doesn't bother retrying expired URLs.

**Response (errors):**

`400 Bad Request` with `MISSING_DEVICE_ID` when `X-Device-ID` is empty. `401 Unauthorized` from middleware when the API key is missing / revoked / expired. `429 Too Many Requests` when the rate limit is exceeded.

Error envelope (consistent across all endpoints):

```json
{ "error": { "code": "MISSING_DEVICE_ID", "message": "X-Device-ID header is required" } }
```

## Endpoint: `GET /api/v1/bundles/{build}/download`

Streams the bundle ZIP. Auth is via Laravel-signed query string — `signature=`, `expires=`, plus the payload (`app_id`, `checksum`, `device`) baked in at URL generation time.

**Headers:** none beyond what the OS HTTP client sends. `X-Bundle-Checksum` and `Content-Length` come back on the response — the SDK uses both for resumable downloads.

**Response:**

`200 OK` with the bundle bytes streamed. `Content-Type: application/zip`. `Content-Disposition: attachment; filename="bundle-<version>.zip"`.

`403 Forbidden` if the signature is missing / invalid / expired, or if the embedded `app_id` doesn't match the build's `app_id`, or if the embedded `checksum` doesn't match the server-side build record. **The 403 path is intentional defense-in-depth** — a leaked or tampered URL produces 403 instead of leaking another tenant's bundle.

`404 Not Found` if the storage backend cannot find the file (e.g. the bundle was archived and the underlying file was purged).

The signed URL TTL is configurable via `NATIVE_UPDATE_DOWNLOAD_URL_TTL_MINUTES` (default `30` in the Laravel reference). Older defaults were `5` and broke 20 MB+ downloads on slow mobile connections — don't go lower.

## Endpoint: `POST /api/v1/analytics/mau`

Fire-and-forget MAU ping. Called by the SDK whenever the app comes to the foreground (subject to debouncing). Drives MAU billing on the SaaS.

**Headers:** `X-API-Key`, `X-Device-ID`, `X-Platform`, `X-App-Version`, `X-Bundle-Version`.

**Request body:** none required. The reference implementation reads only headers.

**Response:** `200 OK`

```json
{ "success": true, "recorded_at": "2026-05-11T12:34:56.000Z" }
```

**Error:** `400 MISSING_DEVICE_ID` when `X-Device-ID` is empty.

The SDK swallows network errors on this endpoint — a failed MAU ping never blocks an update. Return `200` quickly; if you can't write durably in the request path, write to a queue and ack immediately.

## Endpoint: `POST /api/v1/analytics/download`

Records that a bundle download completed or failed. Called by the SDK after each download attempt.

**Headers:** `X-API-Key`, `X-Device-ID`, `X-Platform`, `X-App-Version`.

**Request body:**

```json
{
  "bundle_id": "0193abcd-ef01-7000-8000-aaaaaaaaaaaa",
  "status": "complete",
  "error": null
}
```

- `bundle_id` (UUID, required) — the `bundleId` returned by `/updates/check`.
- `status` (string, required) — `complete` or `failed`.
- `error` (string ≤500 chars, optional) — only when `status: failed`. Free-form error text from the SDK.

**Response:** `200 OK` `{"success": true}` or `404 BUILD_NOT_FOUND` if the bundle ID is unknown for the caller's app.

The Laravel reference also increments `builds.downloads_count` on a successful event. Custom backends can skip the counter or maintain their own.

## Endpoint: `POST /api/v1/analytics/install`

Records install success, failure, or rollback after the SDK has tried to apply a bundle.

**Headers:** same as `/analytics/download`.

**Request body:**

```json
{
  "bundle_id": "0193abcd-ef01-7000-8000-aaaaaaaaaaaa",
  "status": "complete",
  "error": null,
  "previous_version": "1.3.9"
}
```

- `bundle_id` (UUID, required).
- `status` (string, required) — `complete`, `failed`, or `rollback`. The `rollback` case fires when the SDK detected a startup failure on the new bundle and reverted to the previous one.
- `error` (string ≤500 chars, optional) — only when `status: failed`.
- `previous_version` (string ≤50 chars, optional) — the version the SDK rolled back from, when applicable.

**Response:** `200 OK` `{"success": true}` or `404 BUILD_NOT_FOUND`.

The Laravel reference increments `builds.installs_count` on `complete` and `builds.rollbacks_count` on `rollback`. The dashboard surfaces these counters in the per-build view.

## Error envelope conventions

Every error response uses the same envelope:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable explanation" } }
```

The `code` is a stable string the SDK can switch on (`MISSING_DEVICE_ID`, `BUILD_NOT_FOUND`, `INVALID_API_KEY`, `RATE_LIMITED`, `SIGNATURE_VERIFICATION_FAILED`, etc.). The `message` is human-readable and may change between releases — never parse it.

When in doubt, use the existing codes documented in [SDK Reference → Security → Error Codes](/reference/sdk/security/error-codes). Inventing new codes per-backend leads to drift between SDK error handling and server semantics.

## Field naming reminder

Custom backends sometimes invent field names that "feel" cleaner — `latestVersion` instead of `version`, `url` instead of `downloadUrl`, `sha256` instead of `checksum`. **Don't.** The SDK matches the Laravel reference's field names exactly; renames break SDK parsing without throwing an error you can grep for.

The canonical names, repeated for emphasis:

| Field | Type |
|---|---|
| `available` | boolean |
| `version` | string |
| `bundleId` | string (UUID) |
| `downloadUrl` | string (absolute URL) |
| `checksum` | string (hex SHA-256) |
| `signature` | string (base64 RSA-SHA256) |
| `size` | number (bytes) |
| `mandatory` | boolean |
| `releaseNotes` | string |
| `minNativeVersion` | string (SemVer) |
| `expiresAt` | string (ISO 8601) |

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
