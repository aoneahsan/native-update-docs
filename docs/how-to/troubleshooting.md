---
sidebar_position: 7
title: Troubleshoot updates
description: Diagnose the most common native-update failures — updates not detected, downloads failing, installs rejected, crash rollbacks, and dashboard mismatches — with the real SDK methods.
keywords: [native-update troubleshooting, capacitor ota not working, update not detected, download fails, rollback after update, native-update debug]
last_update:
  date: 2026-07-14
  author: Ahsan Mahmood
---

# How-to: Troubleshoot updates

Work top-down: most "update not working" reports are a channel or app-id mismatch, not a bug.

## Update not detected

1. **Channel must match the upload.** The device checks ONE channel; the build must be active in that same channel.

   ```typescript
   await NativeUpdate.setChannel('production'); // must equal the dashboard upload channel
   const result = await NativeUpdate.sync();
   console.log(result.status); // 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_INSTALLED' | 'ERROR'
   ```

2. **App id and API key must match the dashboard app.** A key from a different app returns no updates (or 401).
3. **The new bundle's version must be higher** than the version the device reports. Same or lower versions are never offered.
4. **Rollout percentage:** with a staged rollout, a device outside the current percentage correctly sees `UP_TO_DATE`. Raise the percentage in the dashboard to include it.
5. **Inspect the wire call directly** — the SDK issues `GET {serverUrl}/v1/updates/check?channel=…` with `X-API-Key`, `X-Device-ID`, `X-Current-Version`, `X-Platform` headers:

   ```bash
   curl -H "X-API-Key: nu_app_…" -H "X-Device-ID: test" \
        -H "X-Current-Version: 1.0.0" -H "X-Platform: android" \
        "https://nativeupdatebe.aoneahsan.com/api/v1/updates/check?channel=production"
   ```

   `{"available": false}` here means the backend has nothing newer for that channel — fix the upload, not the app.

## Download fails

1. **Watch progress + state events** (the only download-related events are these):

   ```typescript
   const progress = await NativeUpdate.addListener('downloadProgress', (p) => {
     console.log(`${p.percent}% of ${p.totalBytes} bytes (${p.bundleId})`);
   });
   const state = await NativeUpdate.addListener('updateStateChanged', (e) => {
     console.log('bundle state:', e.status, e.version);
   });
   ```

2. **Checksum mismatch aborts the install by design.** Re-create and re-upload the bundle rather than retrying the same artifact.
3. **HTTPS is enforced in production** — a plain-`http` `downloadUrl` is rejected. Serve bundles over HTTPS.
4. **Unstable network:** retry with backoff instead of hammering `sync()`:

   ```typescript
   async function syncWithRetry(retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await NativeUpdate.sync();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

## Install fails or is rejected

1. **Validate the bundle explicitly** when debugging signature/checksum problems:

   ```typescript
   const validation = await NativeUpdate.validateUpdate({
     bundlePath: bundle.path,
     checksum: expectedChecksum,
     signature: expectedSignature, // when signing is enforced
   });
   console.log(validation.isValid, validation.details);
   ```

2. **Signature verification:** the public key configured in `liveUpdate.publicKey` must pair with the private key that signed the bundle. Rotating keys? Follow [Rotate signing keys](/how-to/rotate-signing-keys).
3. **`minNativeVersion` gate:** the backend refuses bundles that need a newer native binary than the device runs. Ship the store update first.

## App crashes after an update (rollback)

1. **Call `notifyAppReady()` on every successful boot** — without it the plugin treats the new bundle as broken and auto-rolls back:

   ```typescript
   import { NativeUpdate } from 'native-update';
   // after your app has rendered its first stable frame:
   await NativeUpdate.notifyAppReady();
   ```

2. **Manual recovery:** `await NativeUpdate.reset()` returns the device to the original shipped bundle; `NativeUpdate.list()` + `NativeUpdate.set(bundle)` re-activates a specific downloaded bundle.
3. Full strategy (automatic + server-side + per-device): [Roll back a bad bundle](/how-to/roll-back-bundle).

## Dashboard-side checks

- **Build stuck in "Processing":** the upload has not finished staging — re-upload if it never turns "active".
- **Build not reaching the device:** confirm channel, app id, active status, and rollout percentage — in that order.
- **Sign-in problems:** the dashboard uses Google sign-in; clear cookies for the dashboard domain or try a private window.

## Debug logging

Enable verbose SDK logs during development via the `{ config: … }` overload:

```typescript
await NativeUpdate.configure({
  config: {
    baseUrl: 'https://nativeupdatebe.aoneahsan.com/api',
    apiKey: 'nu_app_…',
    enableLogging: true, // verbose logs in dev builds
  },
});
```

Then inspect the current state with the real inspection methods:

```typescript
console.log('active bundle:', await NativeUpdate.current());
console.log('downloaded bundles:', await NativeUpdate.list());
console.log('latest on server:', await NativeUpdate.getLatest());
console.log('security info:', await NativeUpdate.getSecurityInfo());
```

## Platform notes

- **iOS review prompts** are limited by Apple to ~3 per year per user, and never show in the Simulator — test `requestReview()` on a device and treat `result.displayed === false` as normal.
- **Android Play in-app updates** (`getAppUpdateInfo()`, `performImmediateUpdate()`, …) require the app to be installed from the Play Store on a device with Play services.
- **iOS background updates** need Background App Refresh enabled plus the background capability in Xcode.

## Still stuck?

Gather the plugin version, platform + OS version, the `sync()` result status, and any `updateStateChanged` events, then email [aoneahsan@gmail.com](mailto:aoneahsan@gmail.com).
