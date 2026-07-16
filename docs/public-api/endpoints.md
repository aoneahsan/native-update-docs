---
sidebar_position: 2
title: Public API — Endpoints
description: Every route on the public management API, with curl examples — token introspection, apps, builds, upload, promote, rollout, delete, and job status.
keywords: [native-update api endpoints, ota upload api, promote build api, rollout api, curl native update]
last_update:
  date: 2026-07-16
  author: Ahsan Mahmood
---

# Endpoints

Base URL: `https://nativeupdatebe.aoneahsan.com/api/public/v1`
Auth header on every request: `Authorization: Bearer nu_pat_…`

The examples assume:

```bash
export NATIVE_UPDATE_TOKEN=nu_pat_…
export NU=https://nativeupdatebe.aoneahsan.com/api/public/v1
```

`{app}` accepts the numeric id **or** the string `app_id` (`com.example.app`).
Use `app_id` in CI — it survives re-creating an app.

## Token

### `GET /token`

What this token is and what it may touch. Call it first: it saves an agent from
guessing app ids, and confirms whether deletion is allowed.

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" $NU/token
```

```json
{ "data": {
  "name": "GitHub Actions",
  "permissions": ["manage"],
  "apps": [{ "id": 12, "app_id": "com.example.app", "name": "Example" }],
  "last_used_at": "2026-07-16T09:12:44+00:00",
  "expires_at": null,
  "created_at": "2026-07-16T08:00:00+00:00"
} }
```

The token secret is never returned here. Copy it from the dashboard instead.

## Apps

### `GET /apps`

The apps this token manages. Paginated (20, max 50).

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" "$NU/apps?per_page=50"
```

### `GET /apps/{app}`

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" $NU/apps/com.example.app
```

```json
{ "data": {
  "id": 12,
  "app_id": "com.example.app",
  "bundle_id": "com.example.app",
  "name": "Example",
  "platform": "android",
  "platforms": ["android", "ios"],
  "channels": ["production", "staging"],
  "created_at": "2026-06-01T10:00:00+00:00"
} }
```

Creating and deleting apps stays in the dashboard, which keeps a leaked token's
blast radius small.

## Builds

### `GET /apps/{app}/builds`

Newest first. Filter with `channel` and `status`.

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  "$NU/apps/com.example.app/builds?channel=production&status=active"
```

| Param | Values |
|---|---|
| `channel` | `production` · `staging` · `development` |
| `status` | `uploading` · `processing` · `active` · `archived` · `failed` · `paused` |
| `per_page` | 1–50 (default 20) |
| `page` | Page number |

An unknown `channel` or `status` returns 422 rather than silently ignoring the
filter.

### `GET /apps/{app}/builds/{build}`

```json
{ "data": {
  "id": 42,
  "version": "1.2.0",
  "channel": "production",
  "status": "active",
  "checksum": "e3b0c44298fc1c14…",
  "checksum_algorithm": "SHA-256",
  "signature": "…",
  "file_size": 2438012,
  "release_notes": "Bug fixes",
  "min_native_version": null,
  "rollout_percentage": 100,
  "mandatory": false,
  "promoted_from_id": null,
  "created_at": "2026-07-16T09:00:00+00:00"
} }
```

### `POST /apps/{app}/builds` — upload

Always queued. Returns **202** with a job to poll — see
[Queued jobs](/public-api/async-jobs).

```bash
curl -X POST \
  -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -F "file=@./bundle.zip" \
  -F "version=1.2.0" \
  -F "channel=production" \
  -F "release_notes=Bug fixes" \
  -F "rollout_percentage=10" \
  $NU/apps/com.example.app/builds
```

| Field | Required | Notes |
|---|---|---|
| `file` | yes | A `.zip` bundle. Max 100 MB by default. |
| `version` | yes | Strict semver: `1.2.0`. Must be **newer** than the channel's head. |
| `channel` | yes | `production` · `staging` · `development` |
| `release_notes` | no | ≤ 5000 characters |
| `min_native_version` | no | Minimum native app version |
| `rollout_percentage` | no | 1–100, default 100 |

```json
{ "data": {
  "job_id": "01hq2xk8vt9r3m4n5p6q7s8t9v",
  "status_url": "https://nativeupdatebe.aoneahsan.com/api/public/v1/jobs/01hq2xk8…",
  "build": { "id": 42, "version": "1.2.0", "status": "processing" }
} }
```

Two refusals happen immediately, before any job is created:

| Status | Code | Why |
|---|---|---|
| 409 | `VERSION_ALREADY_EXISTS` | That version is already in the channel |
| 422 | `VERSION_NOT_NEWER` | Not newer than the channel's active head |

The monotonic rule blocks downgrades on a live channel — both an easy mistake
and a way to re-ship a version you already patched.

### `PATCH /apps/{app}/builds/{build}` — pause, resume, archive

```bash
# Stop serving a bad release immediately
curl -X PATCH -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"paused"}' \
  $NU/apps/com.example.app/builds/42
```

| Field | Values |
|---|---|
| `status` | `active` · `paused` · `archived` |
| `release_notes` | ≤ 5000 characters |
| `min_native_version` | string or null |

Only `active` builds are served to devices, so pausing takes effect on the next
update check.

### `POST /apps/{app}/builds/{build}/promote`

Copies a build into another channel without re-uploading it — the new row points
at the same stored bundle.

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_channel":"production"}' \
  $NU/apps/com.example.app/builds/42/promote
```

Returns **201** with the new build (`promoted_from_id` points back at the
source). Promoting into its own channel returns 422 `ALREADY_IN_CHANNEL`.

### `PATCH /apps/{app}/builds/{build}/rollout`

```bash
curl -X PATCH -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage":25}' \
  $NU/apps/com.example.app/builds/42/rollout
```

`rollout_percentage` is 0–100. Ramp a release: 10 → 25 → 50 → 100.

### `DELETE /apps/{app}/builds/{build}`

Needs a token with **`builds.delete`**; otherwise 403
`TOKEN_PERMISSION_DENIED`.

```bash
curl -X DELETE -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  $NU/apps/com.example.app/builds/42
```

Deletion is permanent, and the stored bundle is cleaned up in the background.
A build promoted elsewhere keeps working — promotions share one stored object,
which the cleanup respects.

## Jobs

### `GET /jobs/{jobId}`

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" $NU/jobs/01hq2xk8…
```

```json
{ "data": {
  "id": "01hq2xk8vt9r3m4n5p6q7s8t9v",
  "type": "build.process",
  "status": "completed",
  "attempts": 1,
  "result": { "build_id": 42, "version": "1.2.0", "channel": "production" },
  "error": null,
  "status_url": "https://nativeupdatebe.aoneahsan.com/api/public/v1/jobs/01hq2xk8…",
  "queued_at": "2026-07-16T09:00:00+00:00",
  "finished_at": "2026-07-16T09:00:12+00:00"
} }
```

A job is visible to any token that manages its app, so rotating a token does not
strand an in-flight deploy.

## Errors

| Status | Code | Meaning |
|---|---|---|
| 401 | `MISSING_ACCESS_TOKEN` | No token sent |
| 401 | `INVALID_ACCESS_TOKEN_FORMAT` | Not a `nu_pat_…` token (an `nu_app_…` key belongs to the device plane) |
| 401 | `INVALID_ACCESS_TOKEN_CHECKSUM` | Truncated or mistyped |
| 401 | `ACCESS_TOKEN_NOT_FOUND` | Unknown or revoked |
| 401 | `ACCESS_TOKEN_INVALID` | Expired |
| 403 | `TOKEN_PERMISSION_DENIED` | Missing an opt-in permission — see `details.required_permission` |
| 404 | `APP_NOT_FOUND` · `BUILD_NOT_FOUND` · `JOB_NOT_FOUND` | Absent **or** outside this token's apps |
| 409 | `VERSION_ALREADY_EXISTS` | Version already in that channel |
| 422 | `VERSION_NOT_NEWER` · `ALREADY_IN_CHANNEL` | Semantically refused |
| 429 | — | 120/min, or 30 uploads/hour |
| 500 | `UPLOAD_FAILED` | The bundle could not be accepted for processing |
