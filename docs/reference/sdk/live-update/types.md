---
sidebar_position: 3
title: Live Update — Types
description: TypeScript type reference for the Live Update API of native-update. Field-by-field breakdown of BundleInfo, SyncOptions, SyncResult, DownloadOptions, LatestVersion, CheckForUpdateResult, DownloadUpdateOptions, ValidateOptions, ValidationResult, and DeleteOptions.
keywords: [native-update types, BundleInfo, SyncOptions, SyncResult, DownloadOptions, LatestVersion, ValidationResult]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# Live Update — Types

Every TypeScript interface used by Live Update methods. Field tables list every property, the type, whether it is required, and what it means. Examples show realistic shapes — not invented values.

All types are exported from the package root:

```typescript
import type {
  BundleInfo,
  SyncOptions,
  SyncResult,
  DownloadOptions,
  DeleteOptions,
  LatestVersion,
  CheckForUpdateResult,
  DownloadUpdateOptions,
  ValidateOptions,
  ValidationResult,
} from 'native-update';
```

---

## `SyncOptions`

Optional argument to [`sync()`](./methods#syncoptions). Both fields override the persistent config for the duration of the call.

| Field | Type | Required | Description |
|---|---|---|---|
| `channel` | `string` | no | Override the configured channel for this sync only. |
| `updateMode` | [`UpdateMode`](./enums#updatemode) | no | Override the configured `updateStrategy` for this sync only. |

```typescript
const opts: SyncOptions = { channel: 'beta', updateMode: UpdateMode.IMMEDIATE };
```

---

## `SyncResult`

Return value of [`sync()`](./methods#syncoptions). The `status` field is the primary signal.

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | [`SyncStatus`](./enums#syncstatus) | yes | One of `UP_TO_DATE`, `UPDATE_AVAILABLE`, `UPDATE_INSTALLED`, `ERROR`. |
| `version` | `string` | no | Version of the new bundle (when applicable). |
| `description` | `string` | no | Server-provided release notes. |
| `mandatory` | `boolean` | no | `true` if the server marked this update mandatory. |
| `error` | `UpdateError` | no | Populated only when `status === ERROR`. |

```typescript
const result: SyncResult = await NativeUpdate.sync();
// { status: 'UPDATE_INSTALLED', version: '1.2.4', mandatory: false }
```

---

## `DownloadOptions`

Required argument to [`download()`](./methods#downloadoptions). Use this when you want full control of which bundle gets fetched (typical for CI flows or external CDN sources).

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | yes | HTTPS URL of the bundle file. HTTP is rejected. |
| `version` | `string` | yes | Semver string identifying the bundle. |
| `checksum` | `string` | yes | Hex digest using the configured `checksumAlgorithm`. |
| `signature` | `string` | when `requireSignature: true` | Base64 signature over the checksum. |
| `maxRetries` | `number` | no | Override the default retry count for this call. |
| `timeout` | `number` | no | Override the default timeout (ms). |

---

## `DownloadUpdateOptions`

Optional argument to [`downloadUpdate()`](./methods#downloadupdateoptions). All fields are optional; with no args the call defaults to "the latest version on the configured channel".

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `string` | no | Specific version to download. |
| `url` | `string` | no | Override the URL the server returned. |
| `checksum` | `string` | conditional | Required if `url` is overridden. |
| `signature` | `string` | conditional | Required if `url` is overridden and `requireSignature: true`. |
| `onProgress` | `(event: DownloadProgressEvent) => void` | no | Per-call progress callback. Same payload as the `downloadProgress` event. |

---

## `BundleInfo`

The canonical "what is this bundle?" object. Returned by `download()`, `downloadUpdate()`, `current()`, and `list()`. Also passed to `set()`.

| Field | Type | Required | Description |
|---|---|---|---|
| `bundleId` | `string` | yes | Stable identifier for the bundle. The original (binary-shipped) bundle has `bundleId: 'default'`. |
| `version` | `string` | yes | Semver. |
| `path` | `string` | yes | Filesystem path to the unpacked bundle directory on the device. |
| `downloadTime` | `number` | yes | Unix milliseconds when the download completed. |
| `size` | `number` | yes | Bundle size in bytes. |
| `status` | [`BundleStatus`](./enums#bundlestatus) | yes | `PENDING`, `DOWNLOADING`, `READY`, `ACTIVE`, or `FAILED`. |
| `checksum` | `string` | yes | The verified checksum of the on-disk bundle. |
| `signature` | `string` | no | Present when the bundle was signed. |
| `verified` | `boolean` | yes | `true` when checksum (and signature, if required) verification passed. |
| `metadata` | `Record<string, unknown>` | no | Free-form tag bag set by your backend (for example, release notes, author, build number). |

```typescript
const current: BundleInfo = await NativeUpdate.current();
// {
//   bundleId: 'b_2026_04_18_a1f',
//   version: '1.2.4',
//   path: '/data/data/com.you.app/bundles/b_2026_04_18_a1f',
//   downloadTime: 1745000000000,
//   size: 4_521_633,
//   status: 'ACTIVE',
//   checksum: '7e1b…',
//   signature: 'MEUC…',
//   verified: true,
//   metadata: { author: 'ci-bot', notes: 'Hotfix payment redirect' }
// }
```

---

## `DeleteOptions`

Argument to [`delete()`](./methods#deleteoptions). At least one field should be set; passing an empty object is a no-op.

| Field | Type | Required | Description |
|---|---|---|---|
| `bundleId` | `string` | no | Delete this specific bundle. |
| `keepVersions` | `number` | no | Keep the N most recent bundles; delete the rest. |
| `olderThan` | `number` | no | Delete bundles whose `downloadTime` is before this Unix milliseconds value. |

---

## `LatestVersion`

Return value of [`getLatest()`](./methods#getlatest). All fields except `available` are populated only when an update exists.

| Field | Type | Required | Description |
|---|---|---|---|
| `available` | `boolean` | yes | `true` if the server has a newer version on the channel. |
| `version` | `string` | no | Semver of the latest version. |
| `url` | `string` | no | Bundle download URL. |
| `mandatory` | `boolean` | no | `true` if the server marked it mandatory. |
| `notes` | `string` | no | Release notes from the backend. |
| `size` | `number` | no | Bundle size in bytes. |
| `checksum` | `string` | no | Expected checksum (used by the next `downloadUpdate` call). |

---

## `CheckForUpdateResult`

Return value of [`checkForUpdate()`](./methods#checkforupdate). Adds the device's `currentVersion` so you can render a "X → Y" banner without an extra call.

| Field | Type | Required | Description |
|---|---|---|---|
| `available` | `boolean` | yes | `true` if the server has a newer version. |
| `latestVersion` | `string` | no | Semver from the server. |
| `currentVersion` | `string` | yes | Semver currently active on the device. |
| `url` | `string` | no | Bundle URL. |
| `mandatory` | `boolean` | no | Server-marked mandatory. |
| `notes` | `string` | no | Release notes. |
| `size` | `number` | no | Bytes. |
| `checksum` | `string` | no | Expected checksum. |
| `signature` | `string` | no | Expected signature (when signed). |

---

## `ValidateOptions`

Argument to [`validateUpdate()`](./methods#validateupdateoptions). Useful for re-checking a bundle on disk between download and apply.

| Field | Type | Required | Description |
|---|---|---|---|
| `bundlePath` | `string` | yes | Filesystem path to the bundle (typically `BundleInfo.path`). |
| `checksum` | `string` | yes | Expected checksum. |
| `signature` | `string` | no | Expected signature (when `requireSignature: true`). |
| `maxSize` | `number` | no | Reject if the on-disk bundle exceeds this many bytes. |

---

## `ValidationResult`

Return value of [`validateUpdate()`](./methods#validateupdateoptions). The per-aspect `details` lets you surface partial-failure UIs (e.g. "checksum OK but signature failed — was the wrong key used?").

| Field | Type | Required | Description |
|---|---|---|---|
| `isValid` | `boolean` | yes | `true` only if every requested check passed. |
| `error` | `string` | no | Human-readable failure summary when `isValid` is `false`. |
| `details.checksumValid` | `boolean` | no | Per-aspect result. |
| `details.signatureValid` | `boolean` | no | Per-aspect result. |
| `details.sizeValid` | `boolean` | no | Per-aspect result. |
| `details.versionValid` | `boolean` | no | Per-aspect result. |

---

<div className="nu-author-card">
Type definitions verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
