---
sidebar_position: 3
title: Background Update — Config
description: Field-by-field reference for BackgroundUpdateConfig and NotificationPreferences — every option that controls scheduled silent updates and the notifications they post.
keywords: [BackgroundUpdateConfig, NotificationPreferences, BackgroundUpdateType, NotificationPriority, taskIdentifier, requireWifi]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Background Update — Config

`BackgroundUpdateConfig` is the configuration object passed to [`enableBackgroundUpdates()`](./methods#enablebackgroundupdates). `NotificationPreferences` (nested inside) controls what notifications the SDK posts when a background check finds or installs an update.

```typescript
import type {
  BackgroundUpdateConfig,
  NotificationPreferences,
} from 'native-update';
import { BackgroundUpdateType, NotificationPriority } from 'native-update';
```

---

## `BackgroundUpdateConfig`

### Full type

```typescript
interface BackgroundUpdateConfig {
  enabled: boolean;
  checkInterval: number;
  updateTypes: BackgroundUpdateType[];
  autoInstall?: boolean;
  notificationPreferences?: NotificationPreferences;
  respectBatteryOptimization?: boolean;
  allowMeteredConnection?: boolean;
  minimumBatteryLevel?: number;
  requireWifi?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  taskIdentifier?: string;
}
```

### Field reference

#### `enabled`

| | |
|---|---|
| Type | `boolean` |
| Required | **yes** |
| Default | — |

Master switch. Set `false` to register the config but keep the task disabled (useful for staged rollouts of background updates to a subset of users via a feature flag).

---

#### `checkInterval`

| | |
|---|---|
| Type | `number` (seconds) |
| Required | **yes** |
| Default | — |

Requested interval between checks. Both platforms treat this as a target — the OS decides actual cadence. Recommended values:

| Use case | Interval |
|---|---|
| High-priority apps (banking, comms) | `3_600` (1 h) |
| Most apps | `21_600` (6 h) |
| Low-priority apps | `86_400` (24 h) |

Sub-15-minute intervals are silently coerced upward on Android (WorkManager hard floor); on iOS the OS may extend any interval.

---

#### `updateTypes`

| | |
|---|---|
| Type | [`BackgroundUpdateType[]`](#backgroundupdatetype) |
| Required | **yes** |
| Default | — |

Which feature areas to check during the background task. At least one entry required.

---

#### `autoInstall`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `true`, the SDK automatically downloads and stages bundles when a live-update check finds something new. The bundle becomes active on the user's next app launch (or on resume, depending on `updateStrategy`). When `false`, the SDK only emits the [`backgroundUpdateNotification`](./events#backgroundupdatenotification) event and posts a system notification (if configured) — your app handles the download decision when next opened.

App-store updates (Android in-app updates) are **never** auto-installed regardless of this flag, because Play requires a foreground UI prompt before applying.

---

#### `notificationPreferences`

| | |
|---|---|
| Type | [`NotificationPreferences`](#notificationpreferences) |
| Required | no |
| Default | `undefined` (no notifications) |

When set, the SDK posts a system notification when an update is found / installed. When `undefined`, background checks run silently and only emit in-process events. See the [field reference below](#notificationpreferences).

---

#### `respectBatteryOptimization`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `true` |

Android only. When `true`, WorkManager honours Doze and App Standby — the OS may delay or skip background checks to save battery. **Strongly recommend leaving as `true`** — Play Store rejects most apps that ask for the `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission required to bypass this.

---

#### `allowMeteredConnection`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `false` (default), background checks only run on unmetered connections (typically Wi-Fi). When `true`, checks may run on cellular. Note: even with `true`, the user's OS-level data-saver setting can still prevent background work on cellular.

---

#### `minimumBatteryLevel`

| | |
|---|---|
| Type | `number` (0–100) |
| Required | no |
| Default | `0` |

Skip the check if the device battery is below this percentage. The check is in-process — set this to `20` or higher to be a good citizen. The OS does not enforce this directly; the SDK aborts the task if the threshold is not met.

---

#### `requireWifi`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

Requires Wi-Fi (unmetered) connection for the check. Stricter than `allowMeteredConnection: false` — that allows cellular when no Wi-Fi is available; this requires Wi-Fi. Maps to `NetworkType.UNMETERED` on Android.

---

#### `maxRetries`

| | |
|---|---|
| Type | `number` |
| Required | no |
| Default | `3` |

Maximum retry attempts within a single background-task run if the check fails (network glitch, server 5xx). Each retry waits `retryDelay` ms.

---

#### `retryDelay`

| | |
|---|---|
| Type | `number` (milliseconds) |
| Required | no |
| Default | `60_000` (1 min) |

Delay between retries within a single task run. Apply exponential backoff yourself by capping `maxRetries` low and letting the next scheduled run handle longer outages.

---

#### `taskIdentifier`

| | |
|---|---|
| Type | `string` |
| Required | **yes on iOS** |
| Default | derived from Capacitor `appId` on Android |

Reverse-DNS identifier for the OS-registered task. **On iOS, this MUST also be added to your `Info.plist`** under `BGTaskSchedulerPermittedIdentifiers`. Mismatched identifiers between config and `Info.plist` mean the OS silently ignores task registrations.

```xml title="ios/App/App/Info.plist"
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.yourcompany.yourapp.background-update</string>
</array>
```

---

## `BackgroundUpdateType` {#backgroundupdatetype}

| Member | Wire value | Behaviour |
|---|---|---|
| `APP_UPDATE` | `'app_update'` | Background task calls `getAppUpdateInfo()` only. |
| `LIVE_UPDATE` | `'live_update'` | Background task calls `sync()` (or downloads when `autoInstall: true`). |
| `BOTH` | `'both'` | Both — app update first, then live update. |

Pass as an array. `[BackgroundUpdateType.BOTH]` is shorthand for `[BackgroundUpdateType.APP_UPDATE, BackgroundUpdateType.LIVE_UPDATE]`.

---

## `NotificationPreferences` {#notificationpreferences}

Configures the system notification posted by background checks. Pass under `BackgroundUpdateConfig.notificationPreferences` or update later via [`setNotificationPreferences()`](./methods#setnotificationpreferences).

### Full type

```typescript
interface NotificationPreferences {
  title?: string;
  description?: string;
  iconName?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  showActions?: boolean;
  actionLabels?: {
    updateNow?: string;
    updateLater?: string;
    dismiss?: string;
  };
  channelId?: string;
  channelName?: string;
  priority?: NotificationPriority;
}
```

### Field reference

| Field | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Update available'` | Notification title. Localise via your i18n layer. |
| `description` | `string` | `'A new version is ready.'` | Notification body. |
| `iconName` | `string` | platform default | Android only — name of a drawable resource (`'ic_notification'`). iOS uses your app icon. |
| `soundEnabled` | `boolean` | `false` | Whether to play the notification sound. Default off because update notifications interrupting media playback is rude. |
| `vibrationEnabled` | `boolean` | `false` | Android only — whether to vibrate. |
| `showActions` | `boolean` | `true` | Whether to show "Update now / Later / Dismiss" action buttons. |
| `actionLabels` | `object` | English defaults | Per-action label overrides. Provide all three for full localisation. |
| `channelId` | `string` | `'native-update'` | Android notification channel ID. The SDK creates the channel on first notification. |
| `channelName` | `string` | `'App updates'` | Android notification channel name shown in system settings. |
| `priority` | [`NotificationPriority`](#notificationpriority) | `DEFAULT` | Android channel importance. iOS notifications use the system default. |

---

## `NotificationPriority` {#notificationpriority}

| Member | Wire value | Android importance | Behaviour |
|---|---|---|---|
| `MIN` | `'min'` | `IMPORTANCE_MIN` | Silent, no badge, hidden from lock screen. |
| `LOW` | `'low'` | `IMPORTANCE_LOW` | Silent, badge in shade, no heads-up. |
| `DEFAULT` | `'default'` | `IMPORTANCE_DEFAULT` | Standard sound + heads-up briefly. |
| `HIGH` | `'high'` | `IMPORTANCE_HIGH` | Heads-up notification, sound, and vibration. |
| `MAX` | `'max'` | `IMPORTANCE_HIGH` (capped) | Same as HIGH on Android — `IMPORTANCE_MAX` was removed in Android 8+. |

iOS does not expose channel-level priority; iOS notifications always use the system-wide configuration the user picked.

---

## Recommended production config

```typescript
const backgroundUpdate: BackgroundUpdateConfig = {
  enabled: true,
  checkInterval: 21_600,                         // 6h target
  updateTypes: [BackgroundUpdateType.BOTH],
  autoInstall: true,                             // download bundles in advance
  respectBatteryOptimization: true,
  allowMeteredConnection: false,
  minimumBatteryLevel: 20,
  requireWifi: true,
  maxRetries: 2,
  retryDelay: 30_000,
  taskIdentifier: 'com.yourcompany.yourapp.background-update',
  notificationPreferences: {
    title: 'YourApp update available',
    soundEnabled: false,
    showActions: true,
    priority: NotificationPriority.DEFAULT,
  },
};
```

---

<div className="nu-author-card">
Config reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
