---
sidebar_position: 3
title: App Update — Types
description: TypeScript type reference for the App Update API of native-update — AppUpdateInfo and OpenAppStoreOptions, with field-by-field tables and example payloads.
keywords: [AppUpdateInfo, OpenAppStoreOptions, native-update types, in-app update types]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Update — Types

Two TypeScript interfaces define the App Update API surface. Both are exported from the package root:

```typescript
import type { AppUpdateInfo, OpenAppStoreOptions } from 'native-update';
```

---

## `AppUpdateInfo` {#appupdateinfo}

The result of [`getAppUpdateInfo()`](./methods#getappupdateinfo). Most fields are optional because the underlying Play Core / iTunes lookup APIs only populate them in certain conditions.

| Field | Type | Required | Description |
|---|---|---|---|
| `updateAvailable` | `boolean` | yes | `true` if a newer binary version exists in the store. |
| `currentVersion` | `string` | yes | Version of the currently installed binary, as reported by the platform. |
| `availableVersion` | `string` | no | Version available in the store (only when `updateAvailable` is `true`). |
| `updatePriority` | `number` | no | Play priority 0–5. Always populated on Android when an update is available; never populated on iOS / web. See [Update priorities](./overview#update-priorities-android). |
| `immediateUpdateAllowed` | `boolean` | no | Android: `true` if the priority + freshness rules permit `performImmediateUpdate()`. Always `false` on iOS / web. |
| `flexibleUpdateAllowed` | `boolean` | no | Android: `true` if `startFlexibleUpdate()` is permitted. Always `false` on iOS / web. |
| `clientVersionStalenessDays` | `number` | no | Days since the user's installed version was the latest. Useful for "your app is N days behind" UI. |
| `installStatus` | [`InstallStatus`](./events#installstatus) | no | Populated when a flexible update is mid-flight. |
| `bytesDownloaded` | `number` | no | Cumulative bytes downloaded for an in-progress flexible update. |
| `totalBytesToDownload` | `number` | no | Total bytes for the in-progress flexible update. |

```typescript
const info: AppUpdateInfo = await NativeUpdate.getAppUpdateInfo();
// {
//   updateAvailable: true,
//   currentVersion: '1.2.3',
//   availableVersion: '1.2.4',
//   updatePriority: 4,
//   immediateUpdateAllowed: true,
//   flexibleUpdateAllowed: true,
//   clientVersionStalenessDays: 12,
//   installStatus: undefined,
//   bytesDownloaded: 0,
//   totalBytesToDownload: 0
// }
```

### Decision matrix

How to branch on `AppUpdateInfo` to choose the right UX:

```typescript
function chooseFlow(info: AppUpdateInfo, platform: 'ios' | 'android' | 'web') {
  if (!info.updateAvailable) return 'none';
  if (platform !== 'android') return 'open-store';                     // iOS / web fallback
  if (info.updatePriority >= 5 && info.immediateUpdateAllowed) return 'immediate';
  if (info.updatePriority >= 3 && info.flexibleUpdateAllowed) return 'flexible-modal';
  if (info.updatePriority >= 1 && info.flexibleUpdateAllowed) return 'flexible-banner';
  return 'open-store';
}
```

---

## `OpenAppStoreOptions`

Optional argument to [`openAppStore()`](./methods#openappstore). Used when you want to override the configured `appStoreId` / `packageName` — for example, opening a sister app's store page.

| Field | Type | Required | Description |
|---|---|---|---|
| `appId` | `string` | no | iOS expects the numeric App Store ID (e.g. `'1234567890'`). Android expects the Java package name (e.g. `'com.yourcompany.yourapp'`). |

```typescript
const opts: OpenAppStoreOptions = { appId: '1234567890' };
await NativeUpdate.openAppStore(opts);
```

If both stores need different IDs (typical in production), configure them once in `AppUpdateConfig.appStoreId` + `AppUpdateConfig.packageName` in [config](./config) and call `openAppStore()` with no arguments.

---

<div className="nu-author-card">
Type definitions verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
