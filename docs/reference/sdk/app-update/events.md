---
sidebar_position: 4
title: App Update — Events
description: Event reference for the App Update API of native-update — appUpdateStateChanged, appUpdateProgress, appUpdateAvailable, appUpdateReady, appUpdateFailed, appUpdateNotificationClicked, appUpdateInstallClicked. Includes payload shapes, fire conditions, and the InstallStatus enum.
keywords: [appUpdateStateChanged, appUpdateProgress, appUpdateReady, appUpdateFailed, InstallStatus, native-update events]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Update — Events

Seven events fire across the App Update lifecycle, all on Android (Play Core's update flow). On iOS and web, App Update is fundamentally synchronous (a single `getAppUpdateInfo()` call followed by `openAppStore()`), so these events do not fire on those platforms.

Subscribe with `addListener()`; the returned handle has a `remove()` method.

```typescript
import { NativeUpdate } from 'native-update';
import type {
  AppUpdateStateChangedEvent,
  AppUpdateProgressEvent,
  AppUpdateAvailableEvent,
  AppUpdateReadyEvent,
  AppUpdateFailedEvent,
  AppUpdateNotificationClickedEvent,
  AppUpdateInstallClickedEvent,
  PluginListenerHandle,
} from 'native-update';
```

---

## `appUpdateStateChanged`

Fires whenever the install status of an in-progress flexible update changes.

```typescript
interface AppUpdateStateChangedEvent {
  status: InstallStatus;
  installErrorCode?: number;
}
```

| Field | Type | Description |
|---|---|---|
| `status` | [`InstallStatus`](#installstatus) | New status of the install. |
| `installErrorCode` | `number` | Play Core's raw error code when `status === FAILED`. See the [Google reference](https://developer.android.com/reference/com/google/android/play/core/install/model/InstallErrorCode). |

```typescript
const handle = await NativeUpdate.addListener(
  'appUpdateStateChanged',
  ({ status, installErrorCode }: AppUpdateStateChangedEvent) => {
    if (status === 'FAILED') {
      reportToSentry(`Update install failed (code ${installErrorCode})`);
    }
  },
);
```

### `InstallStatus` {#installstatus}

| Member | Wire value | Meaning |
|---|---|---|
| `UNKNOWN` | `'UNKNOWN'` | Initial state; no update flow active. |
| `PENDING` | `'PENDING'` | User accepted the prompt; download not started. |
| `DOWNLOADING` | `'DOWNLOADING'` | Bytes are being fetched from Play. |
| `DOWNLOADED` | `'DOWNLOADED'` | Download complete; install has not yet started. |
| `INSTALLING` | `'INSTALLING'` | Play is applying the APK. |
| `INSTALLED` | `'INSTALLED'` | Done; the app will relaunch. |
| `FAILED` | `'FAILED'` | Install or download failed. |
| `CANCELED` | `'CANCELED'` | User cancelled mid-flow. |

---

## `appUpdateProgress`

Fires repeatedly during a flexible-update download.

```typescript
interface AppUpdateProgressEvent {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
}
```

| Field | Type | Description |
|---|---|---|
| `percent` | `number` | 0–100. |
| `bytesDownloaded` | `number` | Bytes received so far. |
| `totalBytes` | `number` | Total APK size. |

Wire directly into a progress UI without throttling — Play emits ~10–20 events per download.

---

## `appUpdateAvailable`

Fires when `getAppUpdateInfo()` discovers an update. Useful when you want a single subscriber to react to "an update is available now" instead of polling.

```typescript
interface AppUpdateAvailableEvent {
  currentVersion: string;
  availableVersion: string;
  updatePriority: number;
  updateSize?: number;
  releaseNotes?: string[];
  storeUrl?: string;
}
```

| Field | Type | Description |
|---|---|---|
| `currentVersion` | `string` | Installed version. |
| `availableVersion` | `string` | New version available. |
| `updatePriority` | `number` | Play priority 0–5. |
| `updateSize` | `number` | Bytes (from Play's metadata, when present). |
| `releaseNotes` | `string[]` | Localised release notes from the Play listing. |
| `storeUrl` | `string` | Direct deep link to the store page. |

---

## `appUpdateReady`

Fires when a flexible update has finished downloading and is ready for `completeFlexibleUpdate()`.

```typescript
interface AppUpdateReadyEvent {
  message: string;
}
```

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Human-readable message you can surface in a snackbar (localised by the SDK). |

```typescript
await NativeUpdate.addListener('appUpdateReady', ({ message }: AppUpdateReadyEvent) => {
  showSnackbar(message, {
    action: { label: 'Restart', onClick: () => NativeUpdate.completeFlexibleUpdate() },
  });
});
```

---

## `appUpdateFailed`

Fires when an immediate or flexible update fails for any reason.

```typescript
interface AppUpdateFailedEvent {
  error: string;
  code: string;
}
```

| Field | Type | Description |
|---|---|---|
| `error` | `string` | Human-readable failure summary. |
| `code` | `string` | Stable error code from `UpdateErrorCode` enum. |

---

## `appUpdateNotificationClicked`

Fires when the user taps a system notification that the SDK posted (only relevant if you enable [Background Updates](../background-update/overview) and opt in to update notifications). Empty payload — the event itself is the signal.

---

## `appUpdateInstallClicked`

Fires when the user taps the "Install" or "Restart" action on a notification that announced an `appUpdateReady` state. Empty payload. Typically the listener calls `NativeUpdate.completeFlexibleUpdate()` directly.

---

## Cleanup

```typescript
await handle.remove();
// or, to remove every listener across the plugin:
await NativeUpdate.removeAllListeners();
```

---

<div className="nu-author-card">
Event reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
