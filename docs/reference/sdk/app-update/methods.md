---
sidebar_position: 2
title: App Update — Methods
description: Reference for all 5 App Update API methods in native-update — getAppUpdateInfo, performImmediateUpdate, startFlexibleUpdate, completeFlexibleUpdate, openAppStore. Each entry includes signature, parameters, errors, and a runnable example.
keywords: [getAppUpdateInfo, performImmediateUpdate, startFlexibleUpdate, completeFlexibleUpdate, openAppStore, native-update methods]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Update — Methods

Every public method on the App Update interface. Signatures are copied verbatim from `src/definitions.ts` in the plugin repo.

```typescript
import { NativeUpdate } from 'native-update';
```

All methods return `Promise<T>` and throw a typed `UpdateError` for failure cases. The most relevant codes for App Update are listed in the [common errors](#common-errors) section at the bottom.

---

## `getAppUpdateInfo()` {#getappupdateinfo}

```typescript
getAppUpdateInfo(): Promise<AppUpdateInfo>
```

The single read-only call. Returns whether an update is available, what flows are allowed for it, and store-managed download progress (when a flexible update is mid-flight).

**Returns** [`AppUpdateInfo`](./types#appupdateinfo) — `updateAvailable`, `currentVersion`, `availableVersion`, `updatePriority`, `immediateUpdateAllowed`, `flexibleUpdateAllowed`, `clientVersionStalenessDays`, `installStatus`, `bytesDownloaded`, `totalBytesToDownload`.

**Throws** `NETWORK_ERROR` (no connectivity to the lookup endpoint), `PLATFORM_NOT_SUPPORTED` (e.g. Android device without Play Services).

```typescript
const info = await NativeUpdate.getAppUpdateInfo();

if (!info.updateAvailable) return;

console.log(`Update: ${info.currentVersion} → ${info.availableVersion}`);
console.log(`Priority: ${info.updatePriority ?? 'n/a'}`);
console.log(`Stale for ${info.clientVersionStalenessDays ?? 0} days`);
```

Cheap to call. Safe to call at every cold start, on resume, or on a timer. Idempotent.

---

## `performImmediateUpdate()` {#performimmediateupdate}

```typescript
performImmediateUpdate(): Promise<void>
```

Triggers Google Play's **full-screen blocking** update flow. The user sees a Play-branded dialog with "Update" / "Cancel" buttons; choosing "Cancel" exits your app. After successful update, your app relaunches on the new binary.

**Throws** `PLATFORM_NOT_SUPPORTED` on iOS / web, `UPDATE_NOT_AVAILABLE` if no update is staged, `UPDATE_IN_PROGRESS` if a flexible update is already running.

**Best for**: security patches, breaking server contract changes, data-integrity fixes (priority 5).

```typescript
const info = await NativeUpdate.getAppUpdateInfo();
if (info.updateAvailable && info.immediateUpdateAllowed && info.updatePriority >= 5) {
  await NativeUpdate.performImmediateUpdate();
}
```

:::warning Cancellation kills the app
If the user taps "Cancel", Play exits your app process. Do not save state in the activity that hosts this call without persisting it first.
:::

---

## `startFlexibleUpdate()` {#startflexibleupdate}

```typescript
startFlexibleUpdate(): Promise<void>
```

Triggers Google Play's **background download** flow. The user accepts a small Play dialog, then the download proceeds in the background while the user keeps using your app. When the download finishes, the SDK fires the [`appUpdateReady`](./events#appupdateready) event — that is your cue to call [`completeFlexibleUpdate()`](#completeflexibleupdate).

Subscribe to [`appUpdateProgress`](./events#appupdateprogress) for a download progress UI.

**Throws** `PLATFORM_NOT_SUPPORTED` on iOS / web, `UPDATE_NOT_AVAILABLE`, `UPDATE_IN_PROGRESS`.

**Best for**: non-critical improvements, bug fixes (priority 1–4).

```typescript
await NativeUpdate.startFlexibleUpdate();

const handle = await NativeUpdate.addListener('appUpdateProgress', ({ percent }) => {
  setUpdatePercent(percent);
});

const ready = await NativeUpdate.addListener('appUpdateReady', () => {
  showSnackbar('Update ready — restart to apply', {
    action: { label: 'Restart', onClick: () => NativeUpdate.completeFlexibleUpdate() },
  });
});
```

---

## `completeFlexibleUpdate()` {#completeflexibleupdate}

```typescript
completeFlexibleUpdate(): Promise<void>
```

Finishes a flexible update — applies the downloaded APK and relaunches the app. Call this only after the [`appUpdateReady`](./events#appupdateready) event fires.

**Throws** `PLATFORM_NOT_SUPPORTED` on iOS / web, `UPDATE_NOT_AVAILABLE` if no flexible update is staged, `INSTALL_ERROR` on platform-side install failure.

```typescript
// In response to a user tapping "Restart now":
await NativeUpdate.completeFlexibleUpdate();
// Process exits and relaunches.
```

---

## `openAppStore(options?)` {#openappstore}

```typescript
openAppStore(options?: OpenAppStoreOptions): Promise<void>
```

Cross-platform fallback — opens the store page for your app. Uses `appStoreId` (iOS) or `packageName` (Android) from your [config](./config) by default; pass `options.appId` to override.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `options.appId` | `string` | no | Override the configured app ID. iOS expects the numeric App Store ID; Android expects the Java package name. |

**Throws** `INVALID_CONFIG` (no `appStoreId` / `packageName` configured and no override passed).

```typescript
// Use configured IDs:
await NativeUpdate.openAppStore();

// Override (e.g. opening a sister app's store page):
await NativeUpdate.openAppStore({ appId: '1234567890' });
```

On iOS this opens `itms-apps://itunes.apple.com/app/id<appId>`. On Android it opens `market://details?id=<packageName>` (falling back to the web Play URL if the Play Store app is unavailable). On web it opens `https://apps.apple.com/...` or `https://play.google.com/...` based on `Capacitor.getPlatform()` heuristics — typically web should treat both as outbound links.

---

## Common errors

| Code | When you see it | What to do |
|---|---|---|
| `NETWORK_ERROR` | No connectivity for the lookup call | Cache the last `AppUpdateInfo`; retry on next foreground. |
| `PLATFORM_NOT_SUPPORTED` | Calling `performImmediateUpdate` / `startFlexibleUpdate` / `completeFlexibleUpdate` on iOS or web | Branch on `Capacitor.getPlatform()`; fall back to `openAppStore()`. |
| `UPDATE_NOT_AVAILABLE` | Calling complete / immediate before a download exists | Always gate behind `getAppUpdateInfo()` + `appUpdateReady` event. |
| `UPDATE_IN_PROGRESS` | Triggering a second flow before the first completes | Inspect `info.installStatus`; wait for `INSTALLED` / `FAILED`. |
| `UPDATE_CANCELLED` | User declined the Play prompt | Surface a non-blocking banner; respect their choice for the session. |
| `INSTALL_ERROR` | Play install step failed | Log to your monitoring; retry after a short delay or fall back to `openAppStore()`. |
| `INVALID_CONFIG` | `openAppStore()` called without an ID | Configure `appStoreId` and `packageName` in [config](./config). |

Full code list ships in **Batch 4** alongside the security reference.

---

<div className="nu-author-card">
Method reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
