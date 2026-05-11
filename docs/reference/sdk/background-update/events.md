---
sidebar_position: 4
title: Background Update — Events
description: Event reference for the Background Update API of native-update — backgroundUpdateProgress and backgroundUpdateNotification, with payload shapes and usage patterns.
keywords: [backgroundUpdateProgress, backgroundUpdateNotification, native-update background events]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Background Update — Events

Two events fire while the background task runs. Subscribe with `addListener()`. Listeners must be active **before** the OS fires the task — typically subscribe at app boot, after your `enableBackgroundUpdates()` call.

```typescript
import { NativeUpdate } from 'native-update';
import type {
  BackgroundUpdateProgressEvent,
  BackgroundUpdateNotificationEvent,
  PluginListenerHandle,
} from 'native-update';
```

---

## `backgroundUpdateProgress`

Fires across the lifecycle of a background-task run.

```typescript
interface BackgroundUpdateProgressEvent {
  type: BackgroundUpdateType;          // app_update | live_update | both
  status: 'checking' | 'downloading' | 'installing' | 'completed' | 'failed';
  percent?: number;                     // 0–100, only during 'downloading'
  error?: UpdateError;                  // only when status === 'failed'
}
```

| Field | Type | Description |
|---|---|---|
| `type` | [`BackgroundUpdateType`](./config#backgroundupdatetype) | Which feature area is running. With `BOTH`, the SDK fires this event once per area. |
| `status` | `'checking' \| 'downloading' \| 'installing' \| 'completed' \| 'failed'` | Phase of the task. |
| `percent` | `number?` | Download progress 0–100. Only populated when `status === 'downloading'`. |
| `error` | `UpdateError?` | Populated when `status === 'failed'`. |

### Typical sequence

```
checking → (no update)            → completed
checking → downloading 0..100     → installing → completed
checking → downloading 0..100     → failed
```

### Example

```typescript
const handle: PluginListenerHandle = await NativeUpdate.addListener(
  'backgroundUpdateProgress',
  ({ type, status, percent, error }: BackgroundUpdateProgressEvent) => {
    if (status === 'downloading') {
      console.log(`[bg-update][${type}] ${percent?.toFixed(1)}%`);
    } else if (status === 'failed') {
      reportToSentry(`Background update (${type}) failed: ${error?.message}`);
    } else {
      console.log(`[bg-update][${type}] ${status}`);
    }
  },
);
```

### When does it fire?

This event fires from inside the OS-scheduled task. On iOS, that means your app process is briefly woken to run the task — the listener you registered at app boot has been re-instantiated by the system. On Android with WorkManager, the same applies: your app's webview is not necessarily mounted, but the JavaScript bridge handler runs.

In practice this means: don't rely on UI being visible when this fires. Most apps cache the event payload to local storage (or to memory) and surface it in a banner the next time the user opens the app.

---

## `backgroundUpdateNotification`

Fires when the SDK posts a system notification (or would have, if you have not configured `notificationPreferences`), and again when the user interacts with that notification.

```typescript
interface BackgroundUpdateNotificationEvent {
  type: BackgroundUpdateType;
  updateAvailable: boolean;
  version?: string;
  action?: 'shown' | 'tapped' | 'dismissed';
}
```

| Field | Type | Description |
|---|---|---|
| `type` | [`BackgroundUpdateType`](./config#backgroundupdatetype) | Which feature area triggered the notification. |
| `updateAvailable` | `boolean` | `true` if the check found an update. |
| `version` | `string?` | The available version (when `updateAvailable: true`). |
| `action` | `'shown' \| 'tapped' \| 'dismissed'?` | What the user did with the notification. `undefined` for the first event when the notification is first posted. |

### Lifecycle of a single notification

```
1. Background check finds update
   → backgroundUpdateNotification { updateAvailable: true, action: undefined }
   → SDK posts system notification (if configured)
2. Notification appears on lock screen
   → backgroundUpdateNotification { action: 'shown' }
3. User swipes to dismiss
   → backgroundUpdateNotification { action: 'dismissed' }
   OR user taps to open
   → backgroundUpdateNotification { action: 'tapped' }
   → app foregrounded; consider applying the update
```

### Example — apply update when user taps the notification

```typescript
await NativeUpdate.addListener(
  'backgroundUpdateNotification',
  async ({ type, action, updateAvailable }: BackgroundUpdateNotificationEvent) => {
    if (action === 'tapped' && updateAvailable && type === BackgroundUpdateType.LIVE_UPDATE) {
      // User saw the notification and tapped — apply the staged bundle now.
      await NativeUpdate.applyUpdate();
    }
    if (action === 'tapped' && type === BackgroundUpdateType.APP_UPDATE) {
      // User tapped a "new app version" notification — start the in-app flow.
      const info = await NativeUpdate.getAppUpdateInfo();
      if (info.flexibleUpdateAllowed) {
        await NativeUpdate.startFlexibleUpdate();
      } else {
        await NativeUpdate.openAppStore();
      }
    }
  },
);
```

---

## Cleanup

```typescript
await handle.remove();
// or, to remove every listener across the plugin:
await NativeUpdate.removeAllListeners();
```

---

<div className="nu-author-card">
Event reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
