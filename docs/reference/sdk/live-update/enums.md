---
sidebar_position: 4
title: Live Update — Enums
description: Enum reference for the Live Update API of native-update — UpdateStrategy, UpdateMode, ChecksumAlgorithm, SyncStatus, BundleStatus, and the Live-Update-relevant subset of UpdateErrorCode.
keywords: [native-update enums, UpdateStrategy, UpdateMode, BundleStatus, SyncStatus, ChecksumAlgorithm, UpdateErrorCode]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# Live Update — Enums

Every enum the Live Update API uses, with the wire value (the string the SDK actually sends and stores) for each member. Enums survive TypeScript's compile step and are exported as runtime values:

```typescript
import {
  UpdateStrategy,
  UpdateMode,
  ChecksumAlgorithm,
  SyncStatus,
  BundleStatus,
  UpdateErrorCode,
} from 'native-update';
```

---

## `UpdateStrategy`

The strategy used when a new bundle becomes ready. Set globally in [`LiveUpdateConfig`](./config#updatestrategy) or per-call via [`SyncOptions.updateMode`](./types#syncoptions).

| Member | Wire value | Behaviour |
|---|---|---|
| `IMMEDIATE` | `'immediate'` | Reload the web view as soon as the bundle is `READY`. Best for critical hotfixes; user sees a brief reload. |
| `BACKGROUND` | `'background'` | Apply on next app resume. Best for most apps — invisible to the user. |
| `MANUAL` | `'manual'` | Stay `READY`; your code calls `applyUpdate()` when it wants to switch. Best when you want a "Restart now to apply update" UI. |

---

## `UpdateMode`

Per-call override for how a bundle is applied. Used by [`SyncOptions.updateMode`](./types#syncoptions). Same wire values as `InstallMode`; the two enums exist separately for clarity at the call site.

| Member | Wire value | Behaviour |
|---|---|---|
| `IMMEDIATE` | `'immediate'` | Apply now (web view reload). |
| `ON_NEXT_RESTART` | `'on_next_restart'` | Apply on next cold start. |
| `ON_NEXT_RESUME` | `'on_next_resume'` | Apply when the app is next foregrounded. |

---

## `ChecksumAlgorithm`

The hash algorithm used to verify bundle integrity. Configure via [`LiveUpdateConfig.checksumAlgorithm`](./config#checksumalgorithm). The same algorithm must be used by your CLI signing step.

| Member | Wire value | Notes |
|---|---|---|
| `SHA256` | `'SHA-256'` | Default. ~32-byte hash, fast on every device. Sufficient against accidental corruption and most adversarial tampering. |
| `SHA512` | `'SHA-512'` | ~64-byte hash. Marginally slower verification on older devices; choose if your security review prefers SHA-512 across the board. |

---

## `SyncStatus`

Returned in [`SyncResult.status`](./types#syncresult). Branch on this in your sync handler.

| Member | Wire value | Meaning |
|---|---|---|
| `UP_TO_DATE` | `'UP_TO_DATE'` | Server says no newer bundle on the channel. |
| `UPDATE_AVAILABLE` | `'UPDATE_AVAILABLE'` | An update exists but was not auto-downloaded (e.g. `autoUpdate: false`). |
| `UPDATE_INSTALLED` | `'UPDATE_INSTALLED'` | A new bundle was downloaded, verified, and is now staged or applied. |
| `ERROR` | `'ERROR'` | The sync failed; `result.error` carries the typed `UpdateError`. |

---

## `BundleStatus`

Lifecycle state of a bundle on the device. Available on [`BundleInfo.status`](./types#bundleinfo) and emitted in [`updateStateChanged`](./events#updatestatechanged) events.

| Member | Wire value | Meaning |
|---|---|---|
| `PENDING` | `'PENDING'` | Server told us about it but the download has not started. |
| `DOWNLOADING` | `'DOWNLOADING'` | Bytes are being fetched. |
| `READY` | `'READY'` | Downloaded and verified. Will be applied per the active strategy. |
| `ACTIVE` | `'ACTIVE'` | The web view is currently running this bundle. Exactly one bundle is `ACTIVE` at any time. |
| `FAILED` | `'FAILED'` | Verification failed, the download was cancelled, or the bundle was rolled back. |

---

## `UpdateErrorCode` (Live-Update subset) {#updateerrorcode}

`UpdateErrorCode` is shared across the whole plugin. The codes you are most likely to encounter when working with Live Update are below; the full catalogue ships with the Security batch (Batch 4).

### Network

| Code | Wire value | When |
|---|---|---|
| `NETWORK_ERROR` | `'NETWORK_ERROR'` | DNS failure, no internet, captive portal. |
| `SERVER_ERROR` | `'SERVER_ERROR'` | Server returned 5xx. |
| `TIMEOUT_ERROR` | `'TIMEOUT_ERROR'` | Default timeout exceeded; tune via `DownloadOptions.timeout`. |

### Download

| Code | Wire value | When |
|---|---|---|
| `DOWNLOAD_ERROR` | `'DOWNLOAD_ERROR'` | Generic download failure (TLS, premature close). |
| `STORAGE_ERROR` | `'STORAGE_ERROR'` | Cannot write to the app sandbox (full disk, permission). |
| `SIZE_LIMIT_EXCEEDED` | `'SIZE_LIMIT_EXCEEDED'` | Bundle exceeds `maxBundleSize` or platform cap. |

### Security

| Code | Wire value | When |
|---|---|---|
| `VERIFICATION_ERROR` | `'VERIFICATION_ERROR'` | Generic verification failure (umbrella for the next two). |
| `CHECKSUM_ERROR` | `'CHECKSUM_ERROR'` | Computed checksum did not match expected. |
| `SIGNATURE_ERROR` | `'SIGNATURE_ERROR'` | Public key did not verify the signature over the checksum. |
| `INSECURE_URL` | `'INSECURE_URL'` | HTTP (not HTTPS) URL passed to a download method. |
| `INVALID_CERTIFICATE` | `'INVALID_CERTIFICATE'` | TLS certificate failed pinning or chain validation. |
| `PATH_TRAVERSAL` | `'PATH_TRAVERSAL'` | The bundle ZIP contained an entry that resolves outside the install dir (e.g. `../../etc/passwd`). |

### Installation

| Code | Wire value | When |
|---|---|---|
| `INSTALL_ERROR` | `'INSTALL_ERROR'` | Could not write the bundle into place. |
| `ROLLBACK_ERROR` | `'ROLLBACK_ERROR'` | Rollback to the previous bundle failed. Rare; usually requires a reinstall to recover. |
| `VERSION_MISMATCH` | `'VERSION_MISMATCH'` | Bundle's declared version did not match the version field returned by the server. |

### Configuration

| Code | Wire value | When |
|---|---|---|
| `INVALID_CONFIG` | `'INVALID_CONFIG'` | Required field missing in [`LiveUpdateConfig`](./config). |
| `NOT_CONFIGURED` | `'NOT_CONFIGURED'` | Method called before `initialize()` resolved. |

---

<div className="nu-author-card">
Enum values verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
