---
sidebar_position: 1
title: Manage release channels
description: How to use channels (production, staging, beta, canary) to route different bundle versions to different cohorts of devices without changing your app's code.
keywords: [native-update channels, ota release channels, capacitor staging beta, native-update setChannel, ota canary release]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Manage release channels

You want to route different bundles to different cohorts of users — engineers on a `beta` channel, your QA team on `staging`, real customers on `production` — without rebuilding the app. Channels are the mechanism. This how-to assumes you have completed [Your first OTA update](/tutorials/first-ota-update) at least once.

## The model

A channel is a string label on a bundle. Each device has a configured channel at any moment. `/api/v1/updates/check` returns the newest active bundle for the device's channel — never crosses channels. A device on `staging` cannot accidentally pick up a `production` bundle, and vice versa.

There are no built-in channel names. Conventionally:

| Channel | Cohort | Cadence |
|---|---|---|
| `production` | All real users | Stable releases only. |
| `staging` | QA team | RC builds before promoting to production. |
| `beta` | Opted-in beta users | Weekly or per-feature. |
| `canary` | Engineers + internal testers | Every build. |

The plugin treats them as opaque strings — name them whatever fits your org.

## Step 1 — Declare your channels on the App

In the dashboard (or via Nova for self-hosted) open your App and edit the `channels` field — a JSON array of channel names the app accepts. The default is `["production"]`. Add the others:

```json
["production", "staging", "beta", "canary"]
```

The list gates uploads — the dashboard's "Upload build" form populates a channel dropdown from this array. Devices, on the other hand, can request any channel string they like; missing-channel responses return `available: false`.

## Step 2 — Tag bundles with a channel at build time

The CLI's `bundle create` takes a `--channel` flag (default `production`):

```bash
npx native-update bundle create ./dist --version 1.4.0-rc.1 --channel staging
```

The channel is baked into the bundle's metadata JSON. The upload step uses this to file the bundle into the right channel; the dashboard then surfaces it under that channel's history.

## Step 3 — Switch a device's channel at runtime

The SDK's `setChannel()` method moves the device between channels:

```ts
import { NativeUpdate } from 'native-update';

await NativeUpdate.setChannel('beta');
await NativeUpdate.sync(); // checks against the new channel
```

The new channel persists across launches. The next `sync()` returns whatever is on `beta`. If `beta` has no active bundle newer than the device's current bundle, `available: false` — the device stays on its current bundle.

## Step 4 — Build the channel UI

Most apps expose channel selection only to internal users. A typical pattern:

```ts
// Settings → "Developer" section, only visible to specific user roles.
const channels = ['production', 'staging', 'beta', 'canary'];

async function switchChannel(channel: string) {
  await NativeUpdate.setChannel(channel);
  const result = await NativeUpdate.sync();
  if (result.status === 'available') {
    await NativeUpdate.downloadUpdate();
    alert('Update downloaded — it will apply on next launch.');
  }
}
```

For consumer apps, you can also drive the channel from a server-side flag (feature-flag service, A/B test framework) so users never see the switch — but the server's flag value still has to call `setChannel()` from your code.

## Step 5 — Promote between channels

Promotion = uploading the same artifact to a higher-cadence channel. Two patterns:

**Re-upload.** Run `bundle create --channel production` on the same source tree, sign, upload. The simpler path, but the bundle hash differs (the timestamp in the metadata file changes), which slightly muddies the audit trail.

**Re-tag in the dashboard.** Some backends (the Laravel reference includes this) expose a `promote` endpoint that copies a build row to a new channel without rebuilding. The hosted SaaS dashboard has a "Promote to production" button on the Build view. Re-tagging keeps the exact same artifact bytes — preferable for compliance-heavy environments.

## Common pitfalls

**Devices stuck on the wrong channel.** A user opts into `beta`, hates it, opts out — but `setChannel('production')` only takes effect on next launch. The current bundle stays on the device until a newer one ships on the new channel. Force the switch by also calling `NativeUpdate.reset()` after `setChannel()` — this resets to the bundled-with-app bundle and re-syncs.

**Channel mismatch with API key.** Some backends scope API keys to specific channels (the Laravel reference does not by default). If yours does, devices using a production-only key fail `check` calls when on the `staging` channel. The fix is one API key per app, scoped to all channels — see [API Contract → API key requirements](/backend/api-contract#api-key-requirements).

**Channel name typos.** `Beta` ≠ `beta`. The string match is case-sensitive everywhere — config, dashboard, CLI, SDK. Standardise on lowercase.

## Verification

After switching a test device to `staging`:

```bash
adb logcat | grep native-update    # Android
# or Console.app filter on the iOS device

# You should see:
# [native-update] sync requesting channel=staging
# [native-update] update available: 1.4.0-rc.1
```

If the device shows `channel=production` in the request, the `setChannel()` call did not persist — check that `await` was used and that no error in the surrounding code path aborted before the persistence write.

## Related

- [Roll back a bad bundle](./roll-back-bundle) — use channels to roll back without affecting other cohorts.
- [SDK Reference → Live Update → Methods → setChannel](/reference/sdk/live-update/methods#setchannel) — full method signature.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
