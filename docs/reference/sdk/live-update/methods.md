---
sidebar_position: 2
title: Live Update — Methods
description: Complete reference for all 20 Live Update API methods in native-update. Each entry includes the TypeScript signature, parameters, return value, errors thrown, and a runnable example.
keywords: [native-update methods, live update api, native-update sync, native-update download, native-update applyUpdate]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# Live Update — Methods

Every public method on the Live Update interface, grouped by concern. Signatures are copied verbatim from `src/definitions.ts` in the plugin repo and stay in sync with the published `native-update` npm package.

All methods return `Promise<T>` and throw a typed `UpdateError` (see the [Enums](./enums#updateerrorcode) page for the full code list). Examples assume:

```typescript
import { NativeUpdate } from 'native-update';
```

---

## Sync & check

### `sync(options?)`

```typescript
sync(options?: SyncOptions): Promise<SyncResult>
```

The high-level "do what's needed" call. Asks the server about the latest bundle on the configured channel, downloads it if newer, verifies it, and either applies it immediately or stages it for the next restart / resume — based on the `updateStrategy` you set in [config](./config).

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.channel` | `string` | configured channel | Override the channel for this sync only. Does not persist. |
| `options.updateMode` | [`UpdateMode`](./enums#updatemode) | configured `updateStrategy` | Override how the bundle is applied (immediate / on next restart / on next resume). |

**Returns** [`SyncResult`](./types#syncresult) with `status` set to one of `UP_TO_DATE`, `UPDATE_AVAILABLE`, `UPDATE_INSTALLED`, or `ERROR`.

**Throws** typically `NETWORK_ERROR`, `SERVER_ERROR`, `TIMEOUT_ERROR`. Verification failures surface as a `SyncResult` with `status: ERROR` rather than throwing.

```typescript
const result = await NativeUpdate.sync({ channel: 'beta' });

if (result.status === 'UPDATE_INSTALLED') {
  console.log('Active after next restart:', result.version);
}
```

---

### `getLatest()`

```typescript
getLatest(): Promise<LatestVersion>
```

Pure check. Asks the server about the latest bundle for the configured channel and returns metadata. Does **not** download.

**Returns** [`LatestVersion`](./types#latestversion) — `available`, `version`, `url`, `mandatory`, `notes`, `size`, `checksum`.

```typescript
const latest = await NativeUpdate.getLatest();
if (latest.available) {
  // Show a "New version available" UI; download manually if you want fine control.
}
```

---

### `checkForUpdate()`

```typescript
checkForUpdate(): Promise<CheckForUpdateResult>
```

Convenience wrapper around `getLatest()` that also returns the **current** version on the device, so you can render a clean "1.0.3 → 1.0.5" UI without two calls.

**Returns** [`CheckForUpdateResult`](./types#checkforupdateresult).

```typescript
const check = await NativeUpdate.checkForUpdate();
if (check.available) {
  console.log(`${check.currentVersion} → ${check.latestVersion}`);
}
```

---

## Download

### `download(options)`

```typescript
download(options: DownloadOptions): Promise<BundleInfo>
```

Low-level download with full control. You provide the URL, version, checksum, and (optionally) signature. The plugin verifies them on completion and stores the bundle in `READY` state. Use this when you have an external bundle source (CDN, custom protocol) and want to bypass `getLatest()`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `options.url` | `string` | yes | HTTPS URL of the bundle. |
| `options.version` | `string` | yes | Semver string, used to identify the bundle. |
| `options.checksum` | `string` | yes | Hex digest using the configured `checksumAlgorithm`. |
| `options.signature` | `string` | when `requireSignature: true` | Base64 signature over the checksum. |
| `options.maxRetries` | `number` | no | Override default retry count for this download. |
| `options.timeout` | `number` | no | Override default timeout (ms). |

**Returns** [`BundleInfo`](./types#bundleinfo) of the downloaded bundle.

**Throws** `NETWORK_ERROR`, `DOWNLOAD_ERROR`, `CHECKSUM_ERROR`, `SIGNATURE_ERROR`, `STORAGE_ERROR`, `SIZE_LIMIT_EXCEEDED`, `INSECURE_URL`.

---

### `downloadUpdate(options?)`

```typescript
downloadUpdate(options?: DownloadUpdateOptions): Promise<BundleInfo>
```

High-level download. With no arguments, it asks the server for the latest version on the configured channel and downloads that. With arguments, it downloads the specific version / URL / checksum you pass.

| Parameter | Type | Description |
|---|---|---|
| `options.version` | `string` | Specific version to download. Defaults to "latest". |
| `options.url` | `string` | Override URL (rare). |
| `options.checksum` | `string` | Required if `url` is overridden. |
| `options.signature` | `string` | Required if `requireSignature: true`. |
| `options.onProgress` | `(event: DownloadProgressEvent) => void` | Per-call progress callback. Equivalent to `addListener('downloadProgress', …)` but scoped to this call. |

**Returns** [`BundleInfo`](./types#bundleinfo).

```typescript
const bundle = await NativeUpdate.downloadUpdate({
  onProgress: ({ percent }) => setDownloadPercent(percent),
});
```

---

### `cancelDownload(bundleId)`

```typescript
cancelDownload(bundleId: string): Promise<void>
```

Cancels an active download by `bundleId` (returned from `BundleInfo.bundleId` while downloading). The bundle's status moves to `FAILED` and partially-downloaded bytes are cleaned up.

---

### `cancelAllDownloads()`

```typescript
cancelAllDownloads(): Promise<void>
```

Cancels every active download. Useful in app-resume hooks if you do not want to resume background downloads on metered networks.

---

### `isDownloading(bundleId)`

```typescript
isDownloading(bundleId: string): Promise<boolean>
```

Returns `true` if the given bundle is currently downloading. Cheap call — does not hit the network.

---

### `getActiveDownloadCount()`

```typescript
getActiveDownloadCount(): Promise<number>
```

Returns the number of active downloads. Useful for "do not start another download until current finishes" UI patterns.

---

## Apply & rollback

### `set(bundle)`

```typescript
set(bundle: BundleInfo): Promise<void>
```

Mark a downloaded bundle as the active one. The web view is **not** reloaded — this is the building block, not the trigger. Pair with `reload()` for an immediate switch, or just leave it for the next restart.

---

### `reload()`

```typescript
reload(): Promise<void>
```

Reloads the web view. Combined with `set()` (or after `applyUpdate()`), this hot-swaps to the new bundle.

---

### `applyUpdate(bundleId?)`

```typescript
applyUpdate(bundleId?: string): Promise<void>
```

The "do it" call. With no argument, applies the most recently downloaded bundle in `READY` state. With a `bundleId`, applies that specific one. Internally calls `set()` then `reload()` based on the active strategy.

```typescript
await NativeUpdate.applyUpdate(); // restart now with the latest READY bundle
```

---

### `reset()`

```typescript
reset(): Promise<void>
```

Roll back to the bundle that shipped with the App Store / Play Store binary. Use as a panic button for a bad bundle — though in production this is usually triggered automatically by `notifyAppReady()` failing on the new bundle.

---

### `notifyAppReady()`

```typescript
notifyAppReady(): Promise<void>
```

**The single most important method to remember.** Call this after your app's first meaningful render (router resolved, splash screen dismissed). It signals "I booted successfully on this bundle". If you do not call it, the next launch reverts to the previous bundle as a safety mechanism.

Idempotent — safe to call on every launch.

```typescript
useEffect(() => {
  NativeUpdate.notifyAppReady().catch(console.error);
}, []);
```

---

## Inspect

### `current()`

```typescript
current(): Promise<BundleInfo>
```

Returns the [`BundleInfo`](./types#bundleinfo) of the currently active bundle. The original (binary-shipped) bundle has `bundleId: 'default'` and `version` matching your app's bundled web version.

---

### `list()`

```typescript
list(): Promise<BundleInfo[]>
```

Returns every bundle stored on the device — active, ready-to-apply, downloading, and failed. Useful for cleanup logic or a "downloaded versions" debug screen.

---

## Configure

### `setChannel(channel)` {#setchannel}

```typescript
setChannel(channel: string): Promise<void>
```

Persistently switches the channel used by `sync()` and `getLatest()`. Common values: `production`, `staging`, `beta`. The next `sync()` will fetch from the new channel.

```typescript
await NativeUpdate.setChannel('beta');  // user opts into beta
```

---

### `setUpdateUrl(url)` {#setupdateurl}

```typescript
setUpdateUrl(url: string): Promise<void>
```

Override the configured `serverUrl` at runtime. Mostly useful for QA flows where you want to point a build at a staging server without rebuilding.

---

## Maintenance

### `validateUpdate(options)`

```typescript
validateUpdate(options: ValidateOptions): Promise<ValidationResult>
```

Re-runs verification on a stored bundle. Useful for "did this file get tampered with on disk between download and apply?" checks, especially on jailbroken / rooted devices where the app sandbox is less strict.

| Parameter | Type | Description |
|---|---|---|
| `options.bundlePath` | `string` | Filesystem path to the bundle to validate. |
| `options.checksum` | `string` | Expected checksum. |
| `options.signature` | `string` | Optional signature. |
| `options.maxSize` | `number` | Optional size cap. |

**Returns** [`ValidationResult`](./types#validationresult) with a per-aspect breakdown (`checksumValid`, `signatureValid`, `sizeValid`, `versionValid`).

---

### `delete(options)`

```typescript
delete(options: DeleteOptions): Promise<void>
```

Deletes one or more stored bundles to reclaim disk space.

| Parameter | Type | Description |
|---|---|---|
| `options.bundleId` | `string` | Delete a specific bundle. |
| `options.keepVersions` | `number` | Keep the N most recent bundles, delete the rest. |
| `options.olderThan` | `number` | Delete bundles older than this Unix timestamp (ms). |

```typescript
// keep the 3 most recent bundles, drop the rest
await NativeUpdate.delete({ keepVersions: 3 });
```

---

## Common error codes

These come from the `UpdateErrorCode` enum and are the ones you are most likely to encounter when calling Live Update methods. The full list is on the [Enums](./enums#updateerrorcode) page.

| Code | When you see it | What to do |
|---|---|---|
| `NETWORK_ERROR` | `serverUrl` unreachable, no internet, captive portal | Retry with backoff; fail open to "no update". |
| `SERVER_ERROR` | 5xx from the update server | Retry; alert on persistent failure. |
| `TIMEOUT_ERROR` | Default download timeout exceeded | Increase `timeout` in `DownloadOptions` or move to `BACKGROUND` strategy. |
| `CHECKSUM_ERROR` / `VERIFICATION_ERROR` | Checksum mismatch | Re-sign and re-upload from the CLI. Report to your monitoring. |
| `SIGNATURE_ERROR` | Public key cannot verify the signature | Confirm the public key in [config](./config) matches the private key used by `bundle sign`. |
| `INSECURE_URL` | HTTP (not HTTPS) URL passed to download / setUpdateUrl | Use HTTPS. iOS would block it anyway. |
| `SIZE_LIMIT_EXCEEDED` | Bundle exceeds `maxBundleSize` or platform cap | Slim the bundle (delta updates planned for a future major). |
| `STORAGE_ERROR` | Filesystem write failed (full disk, permissions) | Call `delete()` to free space; surface a "low storage" UI to the user. |

---

<div className="nu-author-card">
Method reference by <a href="https://aoneahsan.com">Ahsan Mahmood</a>. All signatures verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>.
</div>
