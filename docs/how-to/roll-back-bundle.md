---
sidebar_position: 3
title: Roll back a bad bundle
description: How to revert devices to a previous bundle after a bad release. Covers the automatic crash-rollback, the server-side rollout-throttle path, and the explicit per-device rollback API.
keywords: [native-update rollback, ota rollback, capacitor revert bundle, native-update bad release, rollout percentage rollback]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Roll back a bad bundle

You shipped 1.4.0 and rollback alerts are firing. This how-to covers three layers, fastest to safest. Pick the layer that matches how bad the breakage is.

## Layer 1 — Automatic crash rollback (already working)

If the bad bundle prevents your app from booting at all, the SDK rolls back on its own. The mechanism:

`NativeUpdate.notifyAppReady()` is the SDK's "the new bundle works" signal. The SDK calls it from your app code, typically inside the boot sequence. If a bundle is applied and `notifyAppReady()` is never called within the configured window (default 60 seconds from launch), the SDK assumes the bundle crashed before reaching the call, reverts to the previous verified bundle, and marks the failed bundle as `failed` so it won't be retried.

You did not have to do anything to get this — it is on by default. Verify the bundle was rolled back:

```bash
adb logcat | grep native-update
# [native-update] applied bundle 1.4.0
# [native-update] notifyAppReady NOT called within 60s — rolling back
# [native-update] rolled back to bundle 1.3.9
```

If your app calls `notifyAppReady()` and crashes only later in the session, the automatic rollback does not kick in — the bundle is already marked verified. Use Layer 2 or 3 below.

## Layer 2 — Stop serving the bad bundle (cohort-wide rollback)

Cohort-wide rollback prevents any new device from picking up the bad bundle, while devices already on it stay on it until you ship a fixed version. Use this when the bad bundle works at boot but breaks something later (broken feature, regression, performance cliff).

### Option A — Set rollout to 0%

Open the dashboard → **Builds** → click the bad build → set **Rollout %** to `0`. Save.

The backend now responds to `/api/v1/updates/check` as if the build is on 0% rollout. No new devices download it. Devices that already downloaded it are unaffected — they stay on 1.4.0 until you ship 1.4.1.

This is the fastest path. The dashboard write takes effect within ~10 seconds (whatever your backend's cache TTL is on the latest-bundle query).

### Option B — Mark the build inactive

Same dashboard view → toggle **Is Active** to `false`. Save.

Slightly stronger than 0% rollout — even devices that are mid-download abandon the bundle and refuse to apply it. The backend stops responding with this build for any device.

Use this when the bad bundle is dangerous enough that you don't want even the cohort that already downloaded it to apply it after a relaunch.

### Option C — Ship the previous version's metadata as "latest"

The bluntest tool. In the dashboard, mark the previous good build (1.3.9) as active AND mark 1.4.0 as inactive. The check endpoint now returns 1.3.9 to every device — including devices currently on 1.4.0, which see a "downgrade" available.

Downgrades work the same way as upgrades: the SDK fetches the bundle, verifies, applies on next launch. The user's experience: "the update I got this morning seems to have been undone." Acceptable for a real incident, weird otherwise.

Don't use this casually — it amplifies the disruption (every device touched, not just newly-syncing ones). Reserve for genuine "the new bundle is actively dangerous" scenarios.

## Layer 3 — Explicit per-device rollback

The SDK's `LiveUpdate.rollback()` method reverts the device to its previous verified bundle programmatically. Useful when the bad bundle works for most users but breaks something for a specific cohort (locale, OS version, hardware) and you want to give those users a workaround:

```ts
import { NativeUpdate, UpdateErrorCode } from 'native-update';

async function emergencyRollback() {
  try {
    await NativeUpdate.rollback();
    await NativeUpdate.reload();   // Restart so the previous bundle takes over
  } catch (err) {
    if (err.code === UpdateErrorCode.NO_PREVIOUS_BUNDLE) {
      // Device's history has only one bundle — no previous to roll back to.
      alert('Cannot roll back further; please update via the App Store.');
    } else {
      throw err;
    }
  }
}
```

Wire this into a debug menu, a server-controlled feature flag, or a deep-link handler. The user-facing flow can be as simple as a settings toggle that says "Reinstall last working version" — and on confirm, calls `emergencyRollback()`.

## What gets recorded

Every rollback (Layers 1, 2, and 3) fires a `rollback` event into your analytics. The Build row's `Rollbacks` counter goes up. The dashboard's per-build view shows the rollback rate over time — a healthy bundle has ~0% rollbacks; >5% is a yellow flag; >20% is a red flag and warrants Layer 2 intervention.

The Laravel reference backend's `BuildController` increments the counter via the `/api/v1/analytics/install` endpoint when the SDK reports `status: rollback`. Custom backends should match this — see [API Contract](/backend/api-contract).

## After the rollback

Once you have stopped the bleeding, fix the bug in code, bump the version, and ship the fix as a normal release:

```bash
# Assume 1.4.0 was bad and you rolled back to 1.3.9.
# Fix the bug, then:
yarn build
npx native-update bundle create ./dist --version 1.4.1 --channel production
npx native-update bundle sign  ./update-bundles/bundle-1.4.1-*.zip --key ./keys/private-*.pem
# Upload 1.4.1 via the dashboard. Devices on 1.3.9 update to 1.4.1.
```

The bad 1.4.0 build stays in the dashboard with `Is Active: false` so the audit trail is preserved. Do not delete it — the bundle ID is still referenced by every device's analytics events, and deleting the row breaks the join.

## What rollback does NOT do

**Roll back native code.** OTA rollback only swaps the JS / CSS / asset bundle. If 1.4.0 included a `min_native_version` bump to a new app-store binary, rolling back to 1.3.9 does not revert the device's app-store binary. For native-code regressions, you ship a new app-store release; OTA cannot help.

**Reach offline devices.** A device that hasn't synced in 2 days will not hear about your dashboard's rollout-to-0% setting until it next syncs. The slowest devices keep running the bad bundle for as long as they're offline. There is no push channel that overrides this.

**Undo damage already done.** If 1.4.0 wrote bad data to the backend before crashing, rolling back the bundle does not undo the writes. Pair OTA rollback with whatever data-cleanup your specific incident requires.

## Verification

After Layer 2 Option A or B:

```bash
curl https://your-backend.example.com/api/v1/updates/check \
  -H "X-API-Key: <test-key>" \
  -H "X-Device-ID: rollback-test-device" \
  -H "X-Current-Version: 1.3.9" \
  -H "X-Platform: android"
# → {"available":false,"message":"..."} -- the bad build is no longer served
```

If a device on 1.3.9 still sees 1.4.0 offered, your backend cached the old response. Wait for cache TTL or flush manually (the Laravel reference uses a 30-second cache by default; configurable via `NATIVE_UPDATE_CHECK_CACHE_TTL_SECONDS`).

## Related

- [SDK Reference → Live Update → Methods → rollback](/reference/sdk/live-update/methods) — full method signature.
- [Manage release channels](./manage-channels) — channels let you roll back to one cohort without affecting others.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
