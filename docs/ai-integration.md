---
title: AI Integration Guide
description: Quick reference for AI development agents integrating native-update.
sidebar_position: 9
mdx:
  format: md
---


Quick reference for AI development agents (Claude Code, Cursor, Copilot, etc.) to integrate native-update into Capacitor projects.

## Installation

```bash
yarn add native-update
# or
npm install native-update
```

## Core Concepts

Native Update provides three main features:
1. **Live Updates (OTA)** - Deploy JS/HTML/CSS updates without app store approval
2. **App Updates** - Native app store update management (Google Play, App Store)
3. **App Reviews** - In-app review prompts

## Quick Start

### Basic Setup

```typescript
import { NativeUpdate } from 'native-update';

// Configure the plugin (nested UpdateConfig — one section per feature)
await NativeUpdate.configure({
  liveUpdate: {
    appId: 'com.your.app',
    // Canonical rule: serverUrl is the backend base; the plugin appends
    // /v1/updates/check. Hosted backend: https://nativeupdatebe.aoneahsan.com/api
    serverUrl: 'https://nativeupdatebe.aoneahsan.com/api',
    // Sent as X-API-Key on every check. Mint/copy in the dashboard
    // (Apps → your app → API Keys). Supported here since v3.1.3.
    apiKey: 'nu_app_…',
    channel: 'production', // e.g. 'development' | 'staging' | 'production'
    autoUpdate: true,
    updateStrategy: 'background', // 'immediate' | 'background' | 'manual'
  },
});
```

### Live Updates (OTA)

```typescript
import { NativeUpdate } from 'native-update';

// Check and apply updates — sync() reports a status enum
const result = await NativeUpdate.sync();
if (result.status === 'UPDATE_INSTALLED') {
  // sync() already downloaded + staged the bundle
  await NativeUpdate.reload();
}

// Manual update flow
const latest = await NativeUpdate.getLatest();
if (latest.available && latest.url && latest.version && latest.checksum) {
  const bundle = await NativeUpdate.download({
    url: latest.url,
    version: latest.version,
    checksum: latest.checksum,
  });
  await NativeUpdate.set(bundle);
  await NativeUpdate.reload();
}

// Notify app is stable after update (prevents auto-rollback)
await NativeUpdate.notifyAppReady();
```

### App Store Updates

```typescript
import { NativeUpdate } from 'native-update';

// Check for app store updates
const updateInfo = await NativeUpdate.getAppUpdateInfo();
if (updateInfo.updateAvailable) {
  if (updateInfo.updatePriority >= 4) {
    // Critical update - force immediate
    await NativeUpdate.performImmediateUpdate();
  } else {
    // Flexible update - download in background
    await NativeUpdate.startFlexibleUpdate();
    // Later, when ready to install
    await NativeUpdate.completeFlexibleUpdate();
  }
}
```

### App Reviews

```typescript
import { NativeUpdate } from 'native-update';

// Request review at appropriate moment
const eligibility = await NativeUpdate.canRequestReview();
if (eligibility.canRequest) {
  const result = await NativeUpdate.requestReview();
  // result.displayed — note: actual review submission not guaranteed (platform controls)
}
```

## API Reference

### Live Update Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `sync(options?)` | Check and apply updates | `Promise<SyncResult>` |
| `download(options)` | Download specific version | `Promise<BundleInfo>` |
| `set(bundle)` | Set active bundle | `Promise<void>` |
| `reload()` | Reload app with current bundle | `Promise<void>` |
| `reset()` | Reset to original bundle | `Promise<void>` |
| `current()` | Get current bundle info | `Promise<BundleInfo>` |
| `list()` | List all downloaded bundles | `Promise<BundleInfo[]>` |
| `delete(options)` | Delete bundles | `Promise<void>` |
| `notifyAppReady()` | Mark update as stable | `Promise<void>` |
| `getLatest()` | Check for latest version | `Promise<LatestVersion>` |
| `setChannel(channel)` | Switch update channel | `Promise<void>` |
| `setUpdateUrl(url)` | Set update server URL | `Promise<void>` |

### App Update Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAppUpdateInfo()` | Get app store update info | `Promise<AppUpdateInfo>` |
| `performImmediateUpdate()` | Force immediate update | `Promise<void>` |
| `startFlexibleUpdate()` | Start background download | `Promise<void>` |
| `completeFlexibleUpdate()` | Install downloaded update | `Promise<void>` |
| `openAppStore(options?)` | Open app store page | `Promise<void>` |

### App Review Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `requestReview()` | Request in-app review | `Promise<ReviewResult>` |
| `canRequestReview()` | Check review eligibility | `Promise<CanRequestReviewResult>` |

## Configuration Options

`configure()` takes a nested `UpdateConfig` — one optional section per feature:

```typescript
interface UpdateConfig {
  liveUpdate?: LiveUpdateConfig;             // OTA updates
  appUpdate?: AppUpdateConfig;               // app store updates
  appReview?: AppReviewConfig;               // in-app reviews
  backgroundUpdate?: BackgroundUpdateConfig; // background checks + notifications
  security?: SecurityConfig;                 // HTTPS enforcement, cert pinning
}

interface LiveUpdateConfig {
  appId: string;                    // Your app identifier (required)
  serverUrl?: string;               // Backend base URL; checks hit {serverUrl}/v1/updates/check (HTTPS required in production)
  apiKey?: string;                  // Sent as X-API-Key on every check (dashboard: Apps → your app → API Keys). Since v3.1.3
  channel?: string;                 // Update channel (default: 'production')
  autoUpdate?: boolean;             // Auto-check + apply updates
  updateStrategy?: 'immediate' | 'background' | 'manual';
  publicKey?: string;               // Public key for signature verification
  requireSignature?: boolean;       // Reject unsigned bundles
  checksumAlgorithm?: 'SHA-256' | 'SHA-512'; // (default: 'SHA-256')
  checkInterval?: number;           // Auto-check interval
}
```

See the full field list for every section in `src/definitions.ts` or the
[Configuration Guide](https://nativeupdate-docs.aoneahsan.com/reference/sdk/core/config).

## Event Listeners

Available events (see `src/definitions.ts` for payload types):

| Event | Fires when |
|-------|------------|
| `downloadProgress` | OTA bundle download progresses (`{ percent, bytesDownloaded, totalBytes, bundleId }`) |
| `updateStateChanged` | An OTA bundle changes state (pending → downloading → ready → active/failed) |
| `backgroundUpdateProgress` | A background update advances through its phases |
| `backgroundUpdateNotification` | A background-update notification is shown/tapped |
| `appUpdateStateChanged` / `appUpdateProgress` | Native app-store update state/progress changes |
| `appUpdateAvailable` / `appUpdateReady` / `appUpdateFailed` | App-store update lifecycle |
| `appUpdateNotificationClicked` / `appUpdateInstallClicked` | User interacted with an app-update notification |

```typescript
import { NativeUpdate } from 'native-update';

const progressListener = await NativeUpdate.addListener('downloadProgress', (progress) => {
  console.log(`Download: ${progress.percent}%`);
});

const stateListener = await NativeUpdate.addListener('updateStateChanged', (event) => {
  console.log('Bundle state:', event.status);
});

// Later: await progressListener.remove(); or await NativeUpdate.removeAllListeners();
```

## Update Channels

| Channel | Purpose | Auto-Update | Check Interval |
|---------|---------|-------------|----------------|
| `development` | Internal testing | Yes | 1 minute |
| `staging` | QA/Beta testing | Configurable | 1 hour |
| `production` | Live users | No (consent) | Daily |

## Backend Requirements

Easiest path: use the hosted backend at [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com)
(free dashboard — register the app, upload bundles, get the `serverUrl` + API key).
Self-hosting instead? Your server must implement this contract
(full spec: [server requirements](https://nativeupdate-docs.aoneahsan.com/backend/overview)):

### GET {serverUrl}/v1/updates/check?channel={channel}

Request headers sent by the plugin: `X-API-Key`, `X-Device-ID`,
`X-Current-Version`, `X-Platform` (and `X-App-Version` when known). Native
builds also send client-identity headers (`X-Android-Package`,
`X-Android-Cert-Sha256`/`-Sha1`, `X-Ios-Bundle-Id`) — see "Lock your API key to
your clients" below.

Response — `200` with `available: false` when there is no update, `200` with:

```json
{
  "available": true,
  "version": "1.2.0",
  "bundleId": "bundle-ulid",
  "downloadUrl": "https://cdn.example.com/bundles/1.2.0.zip",
  "checksum": "sha256-hex...",
  "signature": "base64signature...",
  "size": 1048576,
  "mandatory": false,
  "releaseNotes": "Bug fixes and improvements"
}
```

`downloadUrl` must be an HTTPS URL that returns the bundle zip.

## Lock your API key to your clients (restrictions)

The `nu_app_…` API key is meant to ship **inside** your app — you do not need
your own backend just to hide it. In the dashboard (**Apps → API Keys →
Restrictions**) you can lock each key to the clients that may use it:

- **Web** — allowed origins (exact `https://app.example.com` or a
  `https://*.example.com` wildcard). Enforced against the browser's `Origin`
  header, so the update API is safe to call directly from your web app. (The
  `/v1/*` API sends permissive CORS precisely so browsers can call it; the real
  gate is this per-key check, not CORS.)
- **Android** — allowed apps by package name + signing-cert SHA-256/SHA-1
  (`keytool -list -printcert`; add both your upload key and the Play App
  Signing cert).
- **iOS** — allowed apps by bundle identifier.

A key with **no** restrictions works from anywhere (default). A restricted key
that a client doesn't satisfy gets `403 { error: { code:
"API_KEY_RESTRICTED", … } }`.

The plugin sends the needed headers automatically on native update checks. If
you run your **own** fetch, read the identity first and attach the headers:

```typescript
import { NativeUpdate } from 'native-update';

const id = await NativeUpdate.getAppIdentity();
const headers: Record<string, string> = { 'X-API-Key': apiKey, /* … */ };
if (id.platform === 'android') {
  if (id.packageName) headers['X-Android-Package'] = id.packageName;
  if (id.certSha256) headers['X-Android-Cert-Sha256'] = id.certSha256;
  if (id.certSha1) headers['X-Android-Cert-Sha1'] = id.certSha1;
} else if (id.platform === 'ios') {
  if (id.bundleId) headers['X-Ios-Bundle-Id'] = id.bundleId;
}
```

**Requirements & honesty:** Android/iOS restrictions only take effect for apps
built with **native-update ≥ 3.2.0** (older builds send no identity and are
blocked by an Android/iOS restriction — web restrictions work with any version).
The native identity headers are **client-attested** (parity with Google Maps
API-key app restrictions): they stop cross-site/casual key reuse and quota
abuse, not a determined attacker replaying headers by hand. Only the web
`Origin` check is browser-enforced.

## CLI Tools

```bash
# Create a bundle from your build
npx native-update bundle create ./dist --version 1.2.0 --output ./bundles

# Sign a bundle
npx native-update bundle sign ./bundles/1.2.0.zip --key ./private.key

# Verify a bundle
npx native-update bundle verify ./bundles/1.2.0.zip --key ./public.key

# Generate signing keys
npx native-update keys generate --type rsa --size 4096
```

Upload the resulting bundle through the dashboard, the public management API, or
the `deploy` command below.

## Public Management API (access tokens)

Everything the dashboard does — list apps, upload a bundle, publish, promote,
adjust rollout — is also an HTTP API. Use it from CI, a script, or an agent.

**Two token families. They are not interchangeable.**

| Token | Prefix | Used by | Where it may live |
|---|---|---|---|
| App API key | `nu_app_…` | The plugin in your app (`/api/v1/updates/check`) | Ships in the app. Lock it down with client restrictions. |
| **Access token** | `nu_pat_…` | **You / CI / an agent** (`/api/public/v1/*`) | **Server or CI secret only — NEVER a browser or a repo.** |

An access token is a user-level secret with no origin restrictions. Anyone
holding it can manage the apps it is scoped to. Treat it like a password.

**Create one:** dashboard → **Access Tokens** → *New token*. Tick the apps it may
manage, and grant *Allow deleting builds* only if you need it. Copy the token
anytime from that page.

### Authenticate

```
Authorization: Bearer nu_pat_…
```

Base URL: `https://nativeupdatebe.aoneahsan.com/api/public/v1`
(`X-Access-Token: nu_pat_…` also works if your transport owns `Authorization`.)

**Start here.** `GET /token` tells an agent who it is and what it may touch, so
it never has to guess an app id:

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/token
```

```json
{ "data": {
  "name": "GitHub Actions",
  "permissions": ["manage"],
  "apps": [{ "id": 12, "app_id": "com.example.app", "name": "Example" }]
} }
```

### Endpoints

`{app}` accepts the numeric id **or** the string `app_id` (`com.example.app`).

| Method | Path | Does |
|---|---|---|
| GET | `/token` | What this token is and which apps it manages |
| GET | `/apps` | Apps this token manages (paginated) |
| GET | `/apps/{app}` | App details |
| GET | `/apps/{app}/builds` | Builds; filter `?channel=` `?status=` |
| GET | `/apps/{app}/builds/{build}` | Build details |
| POST | `/apps/{app}/builds` | **Upload a bundle — queued, returns 202** |
| PATCH | `/apps/{app}/builds/{build}` | Set `status` (`active`/`paused`/`archived`), release notes |
| POST | `/apps/{app}/builds/{build}/promote` | Copy into another channel (`target_channel`) |
| PATCH | `/apps/{app}/builds/{build}/rollout` | Set `rollout_percentage` (0–100) |
| DELETE | `/apps/{app}/builds/{build}` | Delete — needs the `builds.delete` permission |
| GET | `/jobs/{jobId}` | Status of queued work |

Machine-readable spec (OpenAPI 3.1):
<https://nativeupdate-docs.aoneahsan.com/openapi/public-api.json>

### Upload: 202 now, live in a moment

Signing and storing a bundle takes too long to hold a request open, so an upload
is **always queued**. You get a job id; poll it until the build goes live.

```bash
# 1. Upload → 202
curl -X POST \
  -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -F "file=@./bundle.zip" \
  -F "version=1.2.0" \
  -F "channel=production" \
  -F "release_notes=Bug fixes" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/apps/com.example.app/builds
```

```json
{ "data": {
  "job_id": "01hq2xk8...",
  "status_url": "https://nativeupdatebe.aoneahsan.com/api/public/v1/jobs/01hq2xk8...",
  "build": { "id": 42, "version": "1.2.0", "status": "processing" }
} }
```

```bash
# 2. Poll until status is "completed" or "failed"
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/jobs/01hq2xk8...
```

```json
{ "data": {
  "status": "completed",
  "result": { "build_id": 42, "version": "1.2.0", "channel": "production" }
} }
```

**Agents: poll, don't assume.** A 202 means *accepted*, not *live*. The build
stays `processing` and devices never see it until the job reports `completed`.
On `failed`, read `error` — the build never goes live and the owner is emailed.
Poll every ~5s; processing normally finishes in well under a minute.

### CLI equivalents

```bash
export NATIVE_UPDATE_TOKEN=nu_pat_…   # never pass --token in CI; it leaks into logs

npx native-update token info                     # who am I, which apps?
npx native-update apps list
npx native-update builds list com.example.app

# Deploy: zips the directory, uploads, and (with --wait) blocks until live.
# Exits non-zero if the release fails, so CI fails too.
npx native-update deploy ./dist --app com.example.app --version 1.2.0 --wait

npx native-update builds promote com.example.app 42 --to production
npx native-update builds rollout com.example.app 42 --percent 10
npx native-update builds status  com.example.app 42 --set paused
npx native-update jobs status 01hq2xk8... --wait
```

### Errors

Every error uses one envelope:

```json
{ "error": { "code": "APP_NOT_FOUND", "message": "…", "details": { } } }
```

| Status | Code | Meaning |
|---|---|---|
| 401 | `MISSING_ACCESS_TOKEN`, `INVALID_ACCESS_TOKEN_FORMAT`, `ACCESS_TOKEN_NOT_FOUND`, `ACCESS_TOKEN_INVALID` | No, malformed, unknown, revoked, or expired token |
| 403 | `TOKEN_PERMISSION_DENIED` | The token lacks an opt-in permission (`details.required_permission`) |
| 404 | `APP_NOT_FOUND`, `BUILD_NOT_FOUND`, `JOB_NOT_FOUND` | Absent **or** outside this token's apps — the two are deliberately indistinguishable |
| 409 | `VERSION_ALREADY_EXISTS` | That version already exists in the channel |
| 422 | `VERSION_NOT_NEWER` | Not newer than the channel's current head — bump the version |
| 429 | — | Rate limited: 120 requests/min; uploads 30/hour |

**A 404 does not always mean "gone".** Scoping errors answer 404 on purpose, so
the API cannot be used to discover which apps exist. If an app id you believe in
returns 404, check the token's app list with `GET /token` before concluding the
app is missing.

## Platform-Specific Setup

### Android

No additional setup required. The plugin's own Gradle config already includes
the Google Play App Update and Play Review libraries (do NOT add the legacy
`com.google.android.play:core` artifact — it conflicts with them).

### iOS

No additional setup required. Uses native APIs.

### Web (Limited Support)

Web platform supports checking for updates only. Actual OTA updates require native platforms.

## Security Best Practices

1. **Always use HTTPS** for update URLs
2. **Enable signature verification** with RSA/ECDSA keys
3. **Use checksums** to verify bundle integrity
4. **Test rollback** scenarios before production
5. **Implement `notifyAppReady()`** to prevent auto-rollback on stable updates

## Common Patterns

### Check on App Start

```typescript
import { App } from '@capacitor/app';
import { NativeUpdate } from 'native-update';

App.addListener('appStateChange', async ({ isActive }) => {
  if (isActive) {
    const result = await NativeUpdate.sync();
    if (result.status === 'UPDATE_INSTALLED') {
      // Show user prompt to reload (NativeUpdate.reload())
    }
  }
});
```

### Review After Positive Action

```typescript
async function handlePurchaseComplete() {
  // After successful purchase
  const eligibility = await NativeUpdate.canRequestReview();
  if (eligibility.canRequest) {
    await NativeUpdate.requestReview();
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Update not applying | Call `notifyAppReady()` after successful update |
| Rollback on restart | Previous update crashed; check error logs |
| Download fails | Verify network, check server response format |
| Signature invalid | Regenerate keys, re-sign bundle |

## Links

- [Full Documentation](https://nativeupdate-docs.aoneahsan.com/)
- [API Reference](https://nativeupdate-docs.aoneahsan.com/reference/sdk/live-update/methods)
- [Example Apps](https://nativeupdate-docs.aoneahsan.com/tutorials/first-ota-update)
- [CLI Reference](https://nativeupdate-docs.aoneahsan.com/reference/cli/overview)
- [Security Guide](https://nativeupdate-docs.aoneahsan.com/concepts/security-model)
