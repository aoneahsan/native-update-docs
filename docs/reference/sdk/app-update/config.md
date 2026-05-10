---
sidebar_position: 5
title: App Update — Config
description: Field-by-field reference for AppUpdateConfig — every option that controls App Update behaviour at initialise time.
keywords: [AppUpdateConfig, native-update config, appStoreId, packageName, in-app update config]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Update — Config

`AppUpdateConfig` is the configuration block for the App Update feature. Pass it under `appUpdate` when calling `NativeUpdate.initialize()`.

```typescript
import type { AppUpdateConfig } from 'native-update';
```

---

## Full type

```typescript
interface AppUpdateConfig {
  minimumVersion?: string;
  updatePriority?: number;
  appStoreId?: string;
  packageName?: string;
  storeUrl?: {
    android?: string;
    ios?: string;
  };
  checkOnAppStart?: boolean;
  allowDowngrade?: boolean;
}
```

---

## Field reference

### `minimumVersion`

| | |
|---|---|
| Type | `string` |
| Required | no |
| Default | — |

A semver string. When set, [`getAppUpdateInfo()`](./methods#getappupdateinfo) reports `updateAvailable: true` whenever the installed version is below this floor — even if Play / App Store have not yet flagged a newer release. Use this for cross-platform "minimum version gate" logic that does not rely on Android-only Play priorities.

```typescript
minimumVersion: '1.2.0'
```

---

### `updatePriority`

| | |
|---|---|
| Type | `number` (0–5) |
| Required | no |
| Default | `0` |

Local override for Play's priority. Useful on iOS where the platform does not return a priority. The plugin uses this value to populate `AppUpdateInfo.updatePriority` when the platform did not.

---

### `appStoreId`

| | |
|---|---|
| Type | `string` |
| Required | yes for iOS |
| Default | — |

Numeric App Store ID. Found in App Store Connect under your app's "App Information" → "Apple ID". Format: `'1234567890'` (digits only, as a string).

Used by [`openAppStore()`](./methods#openappstore) on iOS and the iTunes lookup call inside [`getAppUpdateInfo()`](./methods#getappupdateinfo).

---

### `packageName`

| | |
|---|---|
| Type | `string` |
| Required | yes for Android |
| Default | derived from Capacitor `appId` |

Java-style package name. Defaults to your Capacitor `appId` (`com.yourcompany.yourapp`) — only set this if your store package name differs from your `appId` (rare).

Used by [`openAppStore()`](./methods#openappstore) on Android.

---

### `storeUrl`

| | |
|---|---|
| Type | `{ android?: string; ios?: string }` |
| Required | no |
| Default | constructed from `appStoreId` / `packageName` |

Override the URLs that [`openAppStore()`](./methods#openappstore) opens. Use this if you want to deep-link to a specific tab on your store listing, or send web users to a custom landing page instead of the store.

```typescript
storeUrl: {
  ios: 'https://apps.apple.com/us/app/yourapp/id1234567890?mt=8',
  android: 'https://play.google.com/store/apps/details?id=com.yourcompany.yourapp&hl=en',
}
```

---

### `checkOnAppStart`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `true`, the SDK calls `getAppUpdateInfo()` automatically on app start and emits the [`appUpdateAvailable`](./events#appupdateavailable) event if an update is found. Saves you from writing the boilerplate.

---

### `allowDowngrade`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `false` (default), the SDK refuses to report an "update available" if the store version is **lower** than the installed version. This guards against rare Play / iTunes lookup glitches that returned old metadata. Set to `true` only if you have a deliberate downgrade scenario (testing builds, beta channels) and understand the risk.

---

## Recommended production config

```typescript
const appUpdate: AppUpdateConfig = {
  appStoreId: '1234567890',                    // iOS App Store ID
  packageName: 'com.yourcompany.yourapp',      // Android package name
  minimumVersion: '1.0.0',                     // bump this for "force-update" gates
  checkOnAppStart: true,                       // auto-fire appUpdateAvailable on boot
  allowDowngrade: false,                       // never; let store metadata be authoritative
};
```

---

<div className="nu-author-card">
Config reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
