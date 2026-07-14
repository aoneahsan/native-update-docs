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
    appId: 'your-app-id',
    // OTA update checks are issued as GET {serverUrl}/v1/updates/check
    serverUrl: 'https://your-update-server.com',
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
`X-Current-Version`, `X-Platform` (and `X-App-Version` when known).

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

Upload the resulting bundle through your backend's dashboard/API (hosted
dashboard: the Upload page at nativeupdate.aoneahsan.com).

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
