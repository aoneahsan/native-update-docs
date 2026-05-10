---
sidebar_position: 5
title: Live Update — Events
description: Event reference for the Live Update API of native-update — downloadProgress and updateStateChanged. Includes payload shapes, when they fire, and a complete listener-and-cleanup pattern.
keywords: [native-update events, downloadProgress, updateStateChanged, native-update addListener]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# Live Update — Events

Two events fire during the Live Update lifecycle. Subscribe with `addListener()`; the returned handle has a `remove()` method you call when you no longer need the listener (typically in your component unmount or app shutdown hook).

```typescript
import { NativeUpdate } from 'native-update';
import type {
  DownloadProgressEvent,
  UpdateStateChangedEvent,
  PluginListenerHandle,
} from 'native-update';
```

---

## `downloadProgress`

Fires repeatedly while a bundle is downloading. The event interval is platform-dependent — typically every ~100 ms or every ~1 % progressed, whichever is less frequent — so it is safe to wire directly into a UI progress bar without throttling.

### Payload

```typescript
interface DownloadProgressEvent {
  percent: number;          // 0–100
  bytesDownloaded: number;  // bytes received so far
  totalBytes: number;       // total bundle size in bytes
  bundleId: string;         // identifies the bundle being downloaded
}
```

| Field | Type | Description |
|---|---|---|
| `percent` | `number` | `bytesDownloaded / totalBytes * 100`. |
| `bytesDownloaded` | `number` | Bytes received so far. |
| `totalBytes` | `number` | Total bundle size, populated as soon as the response headers arrive. |
| `bundleId` | `string` | Stable identifier of the bundle being downloaded. Lets you support multiple in-flight downloads. |

### When it fires

- Once per progress tick during any bundle download (`download()`, `downloadUpdate()`, or the auto-download triggered by `sync()`).
- The final event for a bundle has `percent === 100`. The next signal that the bundle is usable is the `updateStateChanged` event with `status: READY`.

### Example

```typescript
const handle: PluginListenerHandle = await NativeUpdate.addListener(
  'downloadProgress',
  ({ percent, bundleId, bytesDownloaded, totalBytes }: DownloadProgressEvent) => {
    setDownloadPercent(percent);
    setDownloadBundleId(bundleId);
    if (percent === 100) {
      console.log(`[native-update] ${bundleId} download complete (${totalBytes} B)`);
    }
  },
);

// Later, on cleanup:
await handle.remove();
```

---

## `updateStateChanged`

Fires whenever a bundle's [`BundleStatus`](./enums#bundlestatus) changes — the most useful signal for "did the new bundle become active?".

### Payload

```typescript
interface UpdateStateChangedEvent {
  status: BundleStatus;  // PENDING | DOWNLOADING | READY | ACTIVE | FAILED
  bundleId: string;
  version: string;
}
```

| Field | Type | Description |
|---|---|---|
| `status` | [`BundleStatus`](./enums#bundlestatus) | The new state. |
| `bundleId` | `string` | Bundle identifier. |
| `version` | `string` | Semver of the bundle that changed state. |

### Typical state sequence

```
PENDING → DOWNLOADING → READY → ACTIVE
```

A failed verification or cancelled download surfaces as a single transition to `FAILED`.

### When it fires

| Transition | Triggered by |
|---|---|
| `→ PENDING` | Server returned a new version; download has not started. |
| `→ DOWNLOADING` | Download started (after `download()`, `downloadUpdate()`, or auto-download from `sync()`). |
| `→ READY` | Bundle downloaded **and** verified. |
| `→ ACTIVE` | `applyUpdate()`, `set()` + `reload()`, or the configured strategy applied the bundle. |
| `→ FAILED` | Verification failed, download cancelled, or auto-rollback triggered because `notifyAppReady()` was not called on the previous boot. |

### Example — render a "restart to apply" UI

```typescript
const stateHandle = await NativeUpdate.addListener(
  'updateStateChanged',
  ({ status, version }: UpdateStateChangedEvent) => {
    if (status === 'READY') {
      showSnackbar(`Update ${version} is ready — restart to apply.`);
    }
    if (status === 'FAILED') {
      reportToSentry(new Error(`Bundle ${version} failed`));
    }
  },
);
```

---

## Cleanup

The listener handle returned by `addListener()` carries a `remove()` method. Call it when the listener is no longer needed:

```typescript
await handle.remove();
```

For a global "tear it all down" call (e.g. on logout, or in tests), use:

```typescript
await NativeUpdate.removeAllListeners();
```

This removes every listener added via `addListener()` across all event types in the plugin (not just Live Update).

---

## Common pitfalls

- **Forgetting `remove()` in React component unmount.** Each render of a component that registers a listener stacks another subscription. Always remove in the `useEffect` cleanup.
- **Setting state from the listener after unmount.** Wrap the state setter in a "still mounted" check, or use a ref.
- **Subscribing inside `sync()`'s promise chain.** Listeners must be active **before** `sync()` is called or the early `DOWNLOADING` event can be missed. Subscribe at app boot.

---

<div className="nu-author-card">
Event reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
