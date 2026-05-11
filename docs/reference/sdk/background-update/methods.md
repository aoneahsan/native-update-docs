---
sidebar_position: 2
title: Background Update — Methods
description: Reference for all 8 Background Update API methods in native-update — enable/disable, status, schedule, trigger, plus notification preferences and permissions.
keywords: [enableBackgroundUpdates, scheduleBackgroundCheck, triggerBackgroundCheck, requestNotificationPermissions, native-update background methods]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Background Update — Methods

Every public method on the Background Update interface. Signatures are copied verbatim from `src/definitions.ts` in the plugin repo.

```typescript
import { NativeUpdate } from 'native-update';
import type {
  BackgroundUpdateConfig,
  BackgroundUpdateStatus,
  BackgroundCheckResult,
  NotificationPreferences,
  NotificationPermissionStatus,
} from 'native-update';
```

All methods return `Promise<T>`. Errors surface as typed `UpdateError` rejections (see [Security — Error Codes](../security/error-codes) for the full catalogue once Batch 4's security pages are linked into the sidebar).

---

## `enableBackgroundUpdates(config)` {#enablebackgroundupdates}

```typescript
enableBackgroundUpdates(config: BackgroundUpdateConfig): Promise<void>
```

Registers the background-update task with the OS scheduler. Persists `config` so subsequent app launches do not need to re-enable. Idempotent — calling twice with the same config is a no-op; calling twice with different configs replaces the existing schedule.

**Parameters** — see [`BackgroundUpdateConfig`](./config) for every field.

**Throws** `INVALID_CONFIG` (missing `taskIdentifier` on iOS, empty `updateTypes`), `PERMISSION_DENIED` (Android missing `SCHEDULE_EXACT_ALARM` for sub-15-minute intervals).

```typescript
await NativeUpdate.enableBackgroundUpdates({
  enabled: true,
  checkInterval: 21_600,
  updateTypes: [BackgroundUpdateType.BOTH],
  requireWifi: true,
  taskIdentifier: 'com.yourcompany.yourapp.background-update',
});
```

:::tip Set `taskIdentifier` once and never change it
The `taskIdentifier` is also registered in your iOS `Info.plist` under `BGTaskSchedulerPermittedIdentifiers`. Changing it later requires a new app version with an updated plist — devices on the old version will silently stop receiving background updates.
:::

---

## `disableBackgroundUpdates()` {#disablebackgroundupdates}

```typescript
disableBackgroundUpdates(): Promise<void>
```

Cancels the registered background task. The SDK keeps the persisted config so a future `enableBackgroundUpdates()` call without arguments would behave the same — but the prototype requires a config object, so in practice you re-supply it.

```typescript
await NativeUpdate.disableBackgroundUpdates();
```

Use this in a "pause background updates" toggle in your app's settings UI, or temporarily during automated tests.

---

## `getBackgroundUpdateStatus()` {#getbackgroundupdatestatus}

```typescript
getBackgroundUpdateStatus(): Promise<BackgroundUpdateStatus>
```

Returns telemetry about the registered task — last run time, next scheduled run, success/failure counts, last error if any. Useful for a "Background updates" diagnostics screen in your settings UI.

**Returns** [`BackgroundUpdateStatus`](#backgroundupdatestatus).

```typescript
const status = await NativeUpdate.getBackgroundUpdateStatus();
console.log(`Background updates: ${status.enabled ? 'on' : 'off'}`);
console.log(`Last check: ${status.lastCheckTime ? new Date(status.lastCheckTime) : 'never'}`);
console.log(`Failures: ${status.failureCount}`);
```

### `BackgroundUpdateStatus` {#backgroundupdatestatus}

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Whether the task is currently registered. |
| `lastCheckTime` | `number?` | Unix ms of the most recent check, regardless of outcome. |
| `nextCheckTime` | `number?` | Unix ms of the next *scheduled* check (the OS may run earlier or later). |
| `lastUpdateTime` | `number?` | Unix ms of the most recent check that found and applied an update. |
| `currentTaskId` | `string?` | OS-assigned task ID for the active run (only populated mid-flight). |
| `isRunning` | `boolean` | `true` if a check is currently in progress. |
| `checkCount` | `number` | Cumulative count of background checks since first enable. |
| `failureCount` | `number` | Cumulative count of failed background checks. |
| `lastError` | `UpdateError?` | The most recent failure, if any. |

---

## `scheduleBackgroundCheck(interval)` {#schedulebackgroundcheck}

```typescript
scheduleBackgroundCheck(interval: number): Promise<void>
```

Updates only the interval of an already-enabled background task without re-supplying the rest of the config. Equivalent to calling `enableBackgroundUpdates()` with the same config but a new `checkInterval`.

**Parameters**:

| Parameter | Type | Description |
|---|---|---|
| `interval` | `number` | Requested interval in **seconds**. The OS may extend this. |

**Throws** `NOT_CONFIGURED` if background updates were never enabled.

```typescript
// Switch from "every 6 hours" to "every hour" without changing other config:
await NativeUpdate.scheduleBackgroundCheck(3600);
```

---

## `triggerBackgroundCheck()` {#triggerbackgroundcheck}

```typescript
triggerBackgroundCheck(): Promise<BackgroundCheckResult>
```

Runs the same sequence the OS would run, but immediately and in-process. Bypasses OS scheduling entirely — the only gates that still apply are the in-process `requireWifi` and `minimumBatteryLevel` checks.

**Returns** [`BackgroundCheckResult`](#backgroundcheckresult).

**Throws** `NETWORK_ERROR`, `NOT_CONFIGURED`.

```typescript
const result = await NativeUpdate.triggerBackgroundCheck();

if (!result.success && result.error) {
  console.error(`[bg-check] failed: ${result.error.message}`);
} else if (result.updatesFound) {
  console.log('Update found:', result.appUpdate ?? result.liveUpdate);
}
```

Wire this to a "Check now" button in your settings UI.

### `BackgroundCheckResult` {#backgroundcheckresult}

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` if the check completed without error. |
| `updatesFound` | `boolean` | `true` if any of the configured `updateTypes` returned an update. |
| `appUpdate` | `AppUpdateInfo?` | App-store update info (when `updateTypes` includes `APP_UPDATE`). |
| `liveUpdate` | `LatestVersion?` | Live-update info (when `updateTypes` includes `LIVE_UPDATE`). |
| `notificationSent` | `boolean` | `true` if a system notification was posted for this check. |
| `error` | `UpdateError?` | The failure, if `success` is `false`. |

---

## `setNotificationPreferences(preferences)` {#setnotificationpreferences}

```typescript
setNotificationPreferences(preferences: NotificationPreferences): Promise<void>
```

Updates the notification configuration without restarting the background task. Use this when the user changes their preferences in your settings UI.

See [`NotificationPreferences`](./config#notificationpreferences) for every field.

```typescript
await NativeUpdate.setNotificationPreferences({
  title: 'New version available',
  soundEnabled: false,
  priority: NotificationPriority.LOW,
});
```

---

## `getNotificationPermissions()` {#getnotificationpermissions}

```typescript
getNotificationPermissions(): Promise<NotificationPermissionStatus>
```

Returns the current notification permission status. Cheap call — does not prompt the user.

**Returns** [`NotificationPermissionStatus`](#notificationpermissionstatus).

```typescript
const perms = await NativeUpdate.getNotificationPermissions();
if (!perms.granted && perms.canRequest) {
  await NativeUpdate.requestNotificationPermissions();
}
```

### `NotificationPermissionStatus` {#notificationpermissionstatus}

| Field | Type | Description |
|---|---|---|
| `granted` | `boolean` | `true` if the user has granted notification permission. |
| `canRequest` | `boolean` | `true` if the OS will let you prompt for permission. `false` after the user permanently denied (Android) or once the limit is reached (iOS). |
| `shouldShowRationale` | `boolean?` | Android only — `true` if the user denied once but did not select "Don't ask again". Render a rationale UI before re-prompting. |

---

## `requestNotificationPermissions()` {#requestnotificationpermissions}

```typescript
requestNotificationPermissions(): Promise<boolean>
```

Prompts the user for notification permission. On Android 13+ this shows the system permission sheet for `POST_NOTIFICATIONS`; on older Android versions the permission is install-time and this returns `true` without prompting. On iOS this triggers `UNUserNotificationCenter.requestAuthorization`.

**Returns** `true` if the user granted permission, `false` otherwise.

```typescript
const granted = await NativeUpdate.requestNotificationPermissions();
if (!granted) {
  // Degrade gracefully — disable notifications in the background config:
  await NativeUpdate.enableBackgroundUpdates({
    ...currentConfig,
    notificationPreferences: undefined,
  });
}
```

:::warning Render a rationale UI before re-prompting
Both stores penalise apps that immediately re-prompt after a denial. Use `getNotificationPermissions()` to inspect `shouldShowRationale` and explain *why* you want the permission before calling this method again.
:::

---

<div className="nu-author-card">
Method reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
