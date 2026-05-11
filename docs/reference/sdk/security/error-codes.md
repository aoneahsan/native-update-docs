---
sidebar_position: 2
title: Security — Error Codes
description: Complete UpdateErrorCode catalogue for native-update — every code that can be thrown across Live Update, App Update, App Review, Background Update, and Security flows, grouped by domain with recommended remediation.
keywords: [UpdateErrorCode, native-update error codes, NETWORK_ERROR, VERIFICATION_ERROR, SIGNATURE_ERROR, capacitor update errors]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Security — Error Codes

`UpdateErrorCode` is the canonical enum the plugin throws for every typed failure across all four feature areas. Errors come back as `UpdateError` objects:

```typescript
interface UpdateError {
  code: UpdateErrorCode;
  message: string;
  details?: unknown;
}
```

You catch them like any other promise rejection:

```typescript
import { NativeUpdate, UpdateErrorCode } from 'native-update';

try {
  await NativeUpdate.sync();
} catch (e) {
  const err = e as { code: UpdateErrorCode; message: string };
  switch (err.code) {
    case UpdateErrorCode.NETWORK_ERROR:
      retryLater();
      break;
    case UpdateErrorCode.SIGNATURE_ERROR:
      reportToSentry(err);
      break;
    default:
      logUnknown(err);
  }
}
```

---

## Network errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `NETWORK_ERROR` | `'NETWORK_ERROR'` | DNS failure, no internet, captive portal, TLS handshake failure | Retry with exponential backoff. Fail open to "no update available" — do not block the user. |
| `SERVER_ERROR` | `'SERVER_ERROR'` | Update server returned 5xx | Retry; alert your monitoring on persistent 5xx. |
| `TIMEOUT_ERROR` | `'TIMEOUT_ERROR'` | Default timeout exceeded | Increase `downloadTimeout` in `PluginInitConfig` or move to `BACKGROUND` strategy so a long download does not block the foreground. |

---

## Download errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `DOWNLOAD_ERROR` | `'DOWNLOAD_ERROR'` | Generic download failure (TLS aborted, premature close, content-length mismatch) | Retry; if persistent, check server logs for connection-level issues. |
| `STORAGE_ERROR` | `'STORAGE_ERROR'` | Cannot write to the app sandbox (full disk, permission revoked) | Call `delete()` to free old bundles; surface a "low storage" UI to the user. |
| `SIZE_LIMIT_EXCEEDED` | `'SIZE_LIMIT_EXCEEDED'` | Bundle exceeds `maxBundleSize` config or platform-imposed cellular cap | Slim the bundle; raise `maxBundleSize` only if you have validated the bundle is honestly that large. |

---

## Security errors

These are the codes you should treat as alerts — they often indicate either misconfiguration or active tampering attempts.

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `VERIFICATION_ERROR` | `'VERIFICATION_ERROR'` | Umbrella — verification failed but the SDK could not pinpoint which step | Inspect `error.details` for the specific step. |
| `CHECKSUM_ERROR` | `'CHECKSUM_ERROR'` | Computed checksum did not match expected | The bundle was modified after signing. Re-sign and re-upload. Investigate intermediate caches / proxies. |
| `SIGNATURE_ERROR` | `'SIGNATURE_ERROR'` | Public key did not verify the signature over the checksum | Confirm the public key in `LiveUpdateConfig.publicKey` matches the private key used by the CLI `bundle sign` step. |
| `INSECURE_URL` | `'INSECURE_URL'` | HTTP (not HTTPS) URL passed to a download method | Use HTTPS. iOS App Transport Security would block plain HTTP anyway. |
| `INVALID_CERTIFICATE` | `'INVALID_CERTIFICATE'` | TLS certificate failed pinning check or chain validation | Renew + re-pin. See [Certificate pinning](./certificate-pinning). |
| `PATH_TRAVERSAL` | `'PATH_TRAVERSAL'` | Bundle ZIP contained an entry that resolves outside the install directory (e.g. `../../etc/passwd`) | Treat as adversarial — alert your monitoring. The bundle is rejected before any byte is written. |

---

## Installation errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `INSTALL_ERROR` | `'INSTALL_ERROR'` | Could not write the bundle into place after download (filesystem race, atomic-rename failure) | Retry. If persistent, file an issue with `error.details`. |
| `ROLLBACK_ERROR` | `'ROLLBACK_ERROR'` | Rollback to the previous bundle failed | Rare. Usually requires a binary reinstall from the App Store / Play Store to recover. Surface a "Please reinstall the app" dialog. |
| `VERSION_MISMATCH` | `'VERSION_MISMATCH'` | Bundle's declared version did not match the version field returned by the server | The server lied or your build step is out of sync. Check your CI signing flow. |

---

## Permission errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `PERMISSION_DENIED` | `'PERMISSION_DENIED'` | OS denied a required permission (notifications, exact alarms, etc.) | Inspect `error.details` for which permission. Render a rationale UI before re-prompting. |

---

## App-update errors (App Store / Play Store flows)

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `UPDATE_NOT_AVAILABLE` | `'UPDATE_NOT_AVAILABLE'` | Calling complete / immediate before a download exists | Always gate behind `getAppUpdateInfo()` + `appUpdateReady` event. |
| `UPDATE_IN_PROGRESS` | `'UPDATE_IN_PROGRESS'` | Triggering a second flow before the first completes | Inspect `info.installStatus`; wait for `INSTALLED` / `FAILED`. |
| `UPDATE_CANCELLED` | `'UPDATE_CANCELLED'` | User declined the Play prompt | Surface a non-blocking banner; respect their choice for the session. |
| `PLATFORM_NOT_SUPPORTED` | `'PLATFORM_NOT_SUPPORTED'` | Calling Android-only methods on iOS / web; calling a method on Huawei without GMS | Branch on `Capacitor.getPlatform()` and feature-detect via `getAppUpdateInfo()` flags. |

---

## App-review errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `REVIEW_NOT_SUPPORTED` | `'REVIEW_NOT_SUPPORTED'` | Play Services missing (Huawei, F-Droid, no-GMS Android), iOS without StoreKit, web without `webReviewUrl` | Fall back to opening `webReviewUrl` in a browser. |
| `QUOTA_EXCEEDED` | `'QUOTA_EXCEEDED'` | Some platforms surface this when their internal cap is exhausted | Skip silently; quota resets eventually. |
| `CONDITIONS_NOT_MET` | `'CONDITIONS_NOT_MET'` | Plugin-side throttle blocked the call (`minimumDaysSinceInstall`, etc.) | Skip silently; respect the throttle. |

---

## Configuration errors

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `INVALID_CONFIG` | `'INVALID_CONFIG'` | Required field missing in any config block, or value out of range | Inspect `error.message` — it identifies the offending field. |
| `NOT_CONFIGURED` | `'NOT_CONFIGURED'` | Method called before `initialize()` resolved | Await `initialize()` before any other call. Use the `isInitialized()` check in defensive code. |

---

## Catch-all

| Code | Wire value | When | Remediation |
|---|---|---|---|
| `UNKNOWN_ERROR` | `'UNKNOWN_ERROR'` | A failure the SDK could not classify into one of the codes above | Treat as a bug — log `error.details` and file an issue. |

---

## Mapping to Error classes (power users)

The plugin also exports concrete error classes for instanceof checks:

```typescript
import {
  NativeUpdateError,        // base class
  ConfigurationError,       // INVALID_CONFIG, NOT_CONFIGURED
  DownloadError,            // DOWNLOAD_ERROR, NETWORK_ERROR, TIMEOUT_ERROR, STORAGE_ERROR
  ValidationError,          // CHECKSUM_ERROR, SIGNATURE_ERROR, VERIFICATION_ERROR, PATH_TRAVERSAL, VERSION_MISMATCH
  StorageError,             // STORAGE_ERROR, SIZE_LIMIT_EXCEEDED
  UpdateErrorClass,         // alias for the base class kept for backwards compat
} from 'native-update';

try {
  await NativeUpdate.sync();
} catch (e) {
  if (e instanceof ValidationError) {
    // signature / checksum / path-traversal — alert
  } else if (e instanceof DownloadError) {
    // network — retry
  }
}
```

Both styles work — the `code` field is always populated even on instances of the typed classes.

---

<div className="nu-author-card">
Error code catalogue verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
