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
  "all_apps": false,
  "apps": [{ "id": 12, "app_id": "com.example.app", "name": "Example" }],
  "last_used_at": "2026-07-16T09:12:44+00:00",
  "expires_at": null,
  "created_at": "2026-07-16T08:00:00+00:00"
} }
```

`all_apps: true` means the token reaches every app you own — the `apps` list is
then just the current snapshot, and apps you create later are covered too. The
token secret is never returned here. Copy it from the dashboard instead.

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

### `POST /apps` — create

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example","bundle_id":"com.example.app","platform":"both"}' \
  $NU/apps
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Display name |
| `bundle_id` | no | Reverse-DNS package id. Globally unique across the platform; immutable once set |
| `platform` | no | `ios` · `android` · `both` (default `both`) |
| `description` | no | Free text |

Returns **201** with the new app. A token created for **specific apps**
auto-attaches the new app to itself, so you can manage it immediately.

| Status | Code | Why |
|---|---|---|
| 409 | `BUNDLE_ID_TAKEN` | That `bundle_id` already belongs to another app |
| 422 | `APP_LIMIT_REACHED` | Your plan's app quota is full |

### `PATCH /apps/{app}` — edit

```bash
curl -X PATCH -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example (renamed)","platform":"android"}' \
  $NU/apps/com.example.app
```

Edits `name`, `platform`, and `description`. **`bundle_id` is immutable** — it
is not accepted here. Returns **200** with the updated app.

### `DELETE /apps/{app}`

Needs a token with **`apps.delete`**; otherwise 403 `TOKEN_PERMISSION_DENIED`.

```bash
curl -X DELETE -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  $NU/apps/com.example.app
```

```json
{ "data": { "deleted": true, "id": 12 } }
```

Permanent, and **cascading** — it removes the app's builds and API keys with it.

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
| `mandatory` | no | `true` forces the update on eligible devices. Default `false` |

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
| `mandatory` | boolean |

Only `active` builds are served to devices, so pausing takes effect on the next
update check.

Setting `status` to `active` on a build that is still `uploading`, `processing`,
or `failed` returns **422 `BUILD_NOT_READY`** — a build only becomes active when
its upload job completes, never by hand.

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

| Field | Values |
|---|---|
| `rollout_percentage` | 0–100. Ramp a release: 10 → 25 → 50 → 100. `0` halts it |
| `enabled` | boolean — pause (`false`) or resume (`true`) the rollout without changing the percentage |

Send either field, or both. Pausing a rollout stops new devices picking the
build up; resuming continues from the same percentage.

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

## API keys

App API keys (`nu_app_…`) authenticate the plugin inside your app against the
device update plane. Mint, rotate, reveal, restrict, and retire them here — the
secret is only ever shown on create, rotate, and reveal.

### `GET /apps/{app}/api-keys`

Lists the app's keys with safe fields only — never the secret.

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  $NU/apps/com.example.app/api-keys
```

```json
{ "data": [ {
  "id": 5,
  "name": "production",
  "key_preview": "nu_app_9f…c2",
  "status": "active",
  "recoverable": true,
  "restrictions": { "origins": ["https://app.example.com"] },
  "unrestricted": false,
  "blocked_count": 0,
  "last_blocked_at": null,
  "last_blocked_reason": null,
  "last_used_at": "2026-07-16T09:00:00+00:00",
  "rotated_at": null,
  "created_at": "2026-06-01T10:00:00+00:00"
} ] }
```

### `POST /apps/{app}/api-keys` — create

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"production"}' \
  $NU/apps/com.example.app/api-keys
```

```json
{ "data": { "id": 6, "name": "production", "status": "active", "plaintext_key": "nu_app_…" } }
```

Returns **201**. `plaintext_key` is the full key — this is one of only two places
it appears (the other is `reveal`).

| Status | Code | Why |
|---|---|---|
| 422 | `MAX_KEYS_REACHED` | An app allows at most **3 active keys** — rotate or retire one first |
| 429 | `KEY_ACTION_RATE_LIMITED` | Too many key actions in the window; wait for the `Retry-After` header |

### `GET /apps/{app}/api-keys/{key}`

One key, safe fields only (the shape above).

### `POST /apps/{app}/api-keys/{key}/rotate`

Issues a new secret and invalidates the old one immediately. Returns **200**.

```json
{ "data": { "id": 6, "name": "production", "status": "active", "plaintext_key": "nu_app_…" } }
```

### `POST /apps/{app}/api-keys/{key}/reveal`

Re-reads the plaintext of a recoverable key. Returns **200**.

```json
{ "data": { "id": 6, "plaintext_key": "nu_app_…" } }
```

A key minted before recovery existed answers **409 `PLAINTEXT_UNAVAILABLE`** —
rotate it to get a copyable secret.

### `PATCH /apps/{app}/api-keys/{key}/restrictions`

Locks a key to its clients, or clears the lock. Full model:
[restrict API keys](/how-to/restrict-api-keys).

```bash
curl -X PATCH -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "origins": ["https://app.example.com", "https://*.example.com"],
        "android": [{ "package_name": "com.example.app", "sha256": ["AB:CD:…"] }],
        "ios": [{ "bundle_id": "com.example.app" }]
      }' \
  $NU/apps/com.example.app/api-keys/6/restrictions
```

| Field | Notes |
|---|---|
| `origins` | Allowed web origins. Scheme- and port-**exact**; `http://` only for local hosts. Exact host or `https://*.example.com` wildcard |
| `android` | `[{ package_name, sha256?: [], sha1?: [] }]` |
| `ios` | `[{ bundle_id, team_id? }]` |

An **empty body clears every restriction** — the key becomes unrestricted (works
from anywhere). Returns **200** with the updated key.

### `POST /apps/{app}/api-keys/{key}/revoke` · `POST …/deprecate`

`revoke` disables a key immediately; `deprecate` marks it for retirement while it
keeps working. Both return **200** with the updated key.

### `DELETE /apps/{app}/api-keys/{key}`

Needs a token with **`keys.delete`**; otherwise 403 `TOKEN_PERMISSION_DENIED`.

```json
{ "data": { "deleted": true, "id": 6 } }
```

A missing key is 404 `KEY_NOT_FOUND`.

## Signing key

Each app has at most one active signing key. Only the **public** key and its
fingerprint are ever returned — the private key never leaves the server.

### `GET /apps/{app}/signing-key`

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  $NU/apps/com.example.app/signing-key
```

No key yet — this is a `200`, not a 404:

```json
{ "data": { "configured": false } }
```

Configured:

```json
{ "data": {
  "configured": true,
  "id": 3,
  "name": "release",
  "public_key": "-----BEGIN PUBLIC KEY-----\n…",
  "fingerprint": "e3b0c44298fc1c14…",
  "status": "active",
  "created_at": "2026-06-01T10:00:00+00:00",
  "rotated_at": null
} }
```

### `POST /apps/{app}/signing-key` — create

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"release"}' \
  $NU/apps/com.example.app/signing-key
```

Returns **201**. If the app already has a signing key, **409
`SIGNING_KEY_EXISTS`** — rotate it instead.

### `POST /apps/{app}/signing-key/rotate`

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"release-2027"}' \
  $NU/apps/com.example.app/signing-key/rotate
```

Returns **200** with the new public key. With no active key to rotate, **409
`NO_ACTIVE_SIGNING_KEY`** — create one first.

## Keystore backup

Store a copy of your Android signing keystore, zipped, so a CI machine or a new
teammate can retrieve it. The `.zip` is held with **private** visibility and is
only ever streamed back through the API — never a public URL.

### `GET /apps/{app}/keystore`

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  $NU/apps/com.example.app/keystore
```

No backup:

```json
{ "data": { "configured": false } }
```

Configured — metadata only:

```json
{ "data": {
  "configured": true,
  "original_name": "example-release.zip",
  "size_bytes": 4821,
  "sha256": "e3b0c44298fc1c14…",
  "uploaded_at": "2026-07-16T09:00:00+00:00"
} }
```

### `POST /apps/{app}/keystore` — upload / replace

Multipart. The `file` is **required** and must be a **`.zip`, at most 10 MB**.
Uploading again replaces the previous backup.

```bash
curl -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -F "file=@./example-release.zip" \
  $NU/apps/com.example.app/keystore
```

Returns **201** with the metadata above. A non-zip file is **422
`KEYSTORE_MUST_BE_ZIP`**.

### `GET /apps/{app}/keystore/download`

Streams the stored `.zip` back as `application/zip` — proxied from private
storage, so no public link is ever exposed.

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -o keystore.zip \
  $NU/apps/com.example.app/keystore/download
```

With no backup, **404 `KEYSTORE_NOT_FOUND`**.

### `DELETE /apps/{app}/keystore`

```json
{ "data": { "deleted": true } }
```

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
| 403 | `TOKEN_PERMISSION_DENIED` | Missing an opt-in permission (`builds.delete` · `apps.delete` · `keys.delete`) — see `details.required_permission` |
| 404 | `APP_NOT_FOUND` · `BUILD_NOT_FOUND` · `KEY_NOT_FOUND` · `KEYSTORE_NOT_FOUND` · `JOB_NOT_FOUND` | Absent **or** outside this token's apps |
| 409 | `VERSION_ALREADY_EXISTS` · `BUNDLE_ID_TAKEN` · `SIGNING_KEY_EXISTS` · `NO_ACTIVE_SIGNING_KEY` · `PLAINTEXT_UNAVAILABLE` | A conflicting or missing precondition |
| 422 | `VERSION_NOT_NEWER` · `ALREADY_IN_CHANNEL` · `APP_LIMIT_REACHED` · `MAX_KEYS_REACHED` · `BUILD_NOT_READY` · `KEYSTORE_MUST_BE_ZIP` | Semantically refused |
| 429 | `KEY_ACTION_RATE_LIMITED` · — | Rate limited: 120/min, 30 uploads/hour, or a per-key action cap (`Retry-After` header) |
| 500 | `UPLOAD_FAILED` | The bundle could not be accepted for processing |
