---
sidebar_position: 6
title: Error handling philosophy
description: Why native-update fails open on analytics writes, fails closed on signature verification, returns typed error codes, and keeps the app running through OTA failures. Explains the design principles behind the SDK's error surface.
keywords: [native-update error handling, ota fail open fail closed, native-update error codes, capacitor ota resilience, ota analytics fail-open]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Error handling philosophy

`native-update` makes a few opinionated choices about how to fail. They are not the choices a generic SDK would make. This page explains the reasoning so you can predict the SDK's behaviour without reading the source.

The summary is short: the SDK fails closed where correctness matters and fails open where availability matters. Typed error codes everywhere so your code can branch on cause, not on parsed strings. The host app keeps running through almost every failure path — the only failure that should ever crash your app is one that's already in your own code, not in the OTA pipeline.

## The two failure modes that matter

Every error path in a system has to pick one of two postures:

**Fail closed** means "if anything is wrong, refuse to proceed." The verification of a bundle's signature fails closed: if the signature doesn't verify, the SDK does not apply the bundle. Better to leave the user on the old code than to ship them code that might be hostile.

**Fail open** means "if anything is wrong, log it and proceed anyway." An analytics write fails open: if the SDK can't POST to `/api/v1/analytics/install`, it logs the failure and continues. Losing analytics data is worse than dropping the user's update flow because of an unrelated network blip.

The choice between the two is never "which is better generally." It's "which failure mode is worse for this specific operation." The SDK applies each posture deliberately, operation by operation.

## What fails closed

The operations where correctness is non-negotiable:

**Signature verification.** A bundle whose signature does not verify under your public key is rejected. The bundle is deleted; the failed download is reported back to the backend as `download_failed`. The user stays on the previous bundle. No exception, no override, no "trust me" flag.

**SHA-256 checksum mismatch.** Identical disposition. The bytes don't match what the server claimed they would be, so the SDK refuses to apply them.

**HTTPS requirement.** In production builds, `serverUrl` must be HTTPS. The SDK throws at `configure()` time if it isn't — the misconfiguration is caught before any bundle is fetched. The exception is `http://localhost` and `http://127.0.0.1` for development.

**Plugin not initialised.** Calling `sync()` before `configure()` throws `PLUGIN_NOT_INITIALIZED`. The SDK can't know which app the device represents until you tell it.

**Required fields missing.** Calling `setChannel()` with an empty string, or `downloadUpdate()` against a bundle that doesn't exist, throws an `INVALID_ARGUMENT` error rather than silently doing the wrong thing.

In every fail-closed case, the error is **typed** — it carries a stable `UpdateErrorCode` from a small enumerated set ([SDK Reference → Security → Error Codes](/reference/sdk/security/error-codes)). Your code can switch on the code without parsing the human-readable message.

## What fails open

The operations where availability beats strict correctness:

**Analytics writes.** Three endpoints: `mauPing`, `reportDownload`, `reportInstall`. All three fire-and-forget from the SDK's perspective — if the POST fails (network error, server returns 500, server returns 404), the SDK logs the failure at `warn` level and continues. Your update flow is not blocked by a broken analytics endpoint.

**Background-update task scheduling.** The SDK schedules the next periodic check via WorkManager (Android) or BGTaskScheduler (iOS). If the OS-level scheduler rejects the request — task budget exhausted, permitted-identifier missing on iOS, Doze Mode on Android — the SDK logs and returns gracefully. Background updates simply don't fire on this device; foreground sync still works.

**Notification rendering.** Android's `POST_NOTIFICATIONS` permission can be denied by the user. The SDK proceeds with the update; the user just doesn't see the "Update downloaded, tap to install" prompt. Foreground sync calls still surface progress to your UI.

**Optional callbacks.** Config callbacks like `onUpdateAvailable` and `onUpdateDownloaded` are user-provided. The SDK wraps each call in a try/catch so a developer bug in the callback doesn't kill the update flow. The exception is logged; the flow continues.

The pattern is: a failure should never deny the user an outcome they could have had if the failure hadn't happened. A broken analytics write doesn't deny the user an update. A broken background scheduler doesn't deny the user a foreground sync. A broken callback doesn't deny the user the bundle that was about to download.

## Typed error codes everywhere

The SDK never throws a bare `Error('Something went wrong')`. Every thrown or rejected error has:

A **`code`** field — a stable enum value from `UpdateErrorCode`. Examples: `NETWORK_ERROR`, `SIGNATURE_VERIFICATION_FAILED`, `BUNDLE_NOT_FOUND`, `PLATFORM_NOT_SUPPORTED`, `RATE_LIMITED`, `INVALID_CONFIG`. The complete list lives in [SDK Reference → Security → Error Codes](/reference/sdk/security/error-codes). New codes are added in minor versions; existing codes never change meaning across minor versions.

A **`message`** field — a human-readable explanation. Not stable; designed for log inspection by developers, not for parsing by code.

An optional **`details`** field — a structured object with extra context. For `NETWORK_ERROR` it might carry the failed URL; for `SIGNATURE_VERIFICATION_FAILED` it might carry the bundle ID. Always log this in your own error reporter; never parse it in branching logic.

```ts
import { NativeUpdate, UpdateErrorCode } from 'native-update';

try {
  await NativeUpdate.sync();
} catch (err) {
  switch (err.code) {
    case UpdateErrorCode.NETWORK_ERROR:
      // User's offline. Quietly retry later.
      break;
    case UpdateErrorCode.SIGNATURE_VERIFICATION_FAILED:
      // Signing-key drift. Alert support.
      reportToSupport({ kind: 'signing-drift', err });
      break;
    case UpdateErrorCode.RATE_LIMITED:
      // We hit the API key's rate limit. Back off.
      await wait(60_000);
      break;
    default:
      // Unknown — log + carry on.
      console.warn('Unhandled OTA error', err);
  }
}
```

Stable codes let your error-handling logic be precise instead of regex-parsing English strings.

## The host app must keep running

This is the single most important behavioural rule:

> No OTA failure may crash your app.

The native plugin layer catches every internal exception, logs it, and emits a clean rejection back to your JavaScript code. The web layer wraps every async path in try/catch. The bundle-apply step is atomic — the swap either completes fully or doesn't happen — so partial state is impossible. Even if every cryptographic check fails simultaneously, the worst outcome is "the user stays on the old bundle and your callback gets a typed error."

This rule has a corollary: **your own code must not crash on a thrown OTA error.** If you `await NativeUpdate.sync()` without a try/catch, an error in the SDK rejects the promise and an unhandled rejection in your bootstrap path can crash the app. The plugin catches its own errors; you must catch the errors at your call site.

The defensive pattern:

```ts
async function safeBootstrapOta() {
  try {
    await NativeUpdate.configure({ config: liveUpdate });
    await NativeUpdate.notifyAppReady();
    await NativeUpdate.sync();
  } catch (err) {
    // Log it, report it, but DO NOT rethrow.
    // OTA is best-effort; the app must continue.
    logger.warn('OTA bootstrap failed; continuing without update', err);
  }
}

safeBootstrapOta();
```

Notice the bootstrap is fire-and-forget. The app's main render path does not `await` it. OTA is a side-effect of launch, not a launch dependency.

## Conservative defaults are the right defaults

Two specific defaults shape the SDK's failure surface:

**The 60-second `notifyAppReady` window.** When a freshly-applied bundle is staged, it has 60 seconds from the next launch to call `notifyAppReady()` or it gets rolled back. The 60-second figure is generous for any reasonable boot path, tight enough that a crashing bundle doesn't persist across multiple launches.

Could the window be longer? Yes — but a longer window means a crashing bundle stays in place longer before rolling back, and slow rollbacks compound the user-visible damage. Could it be shorter? Yes — but legitimate slow boots (cold cache, slow networks resolving fonts, complex animations) sometimes take 10-20 seconds, and you don't want to roll back legitimate slow starts.

**The 30-minute signed download URL TTL.** When the check endpoint mints a signed URL, the URL is valid for 30 minutes. The figure is calibrated for slow mobile downloads of 20+ MB bundles (the previous 5-minute default routinely expired mid-stream on hotel WiFi). Longer TTLs make replay attacks easier; shorter TTLs make legitimate downloads fail.

If your bundles are unusually large or your users are on unusually slow networks, the TTL is configurable via the backend's `NATIVE_UPDATE_DOWNLOAD_URL_TTL_MINUTES` env var. The defaults are calibrated for the median case.

## What the philosophy gets you

Three properties fall out of this design:

**Predictability.** The same operation always fails the same way. A signature mismatch always throws `SIGNATURE_VERIFICATION_FAILED`. A network error always throws `NETWORK_ERROR`. You can write error-handling code once and trust it across SDK versions.

**Recoverability.** Every failure leaves the system in a known-good state. A failed download leaves no partial bundle on disk. A failed apply leaves the previous bundle active. A failed sync leaves the configured channel unchanged. There is no "the SDK got confused; uninstall and reinstall" failure mode.

**Auditability.** Every failure is logged with structured fields (the typed code, the message, the optional details). Hook a logger into your observability stack and you can see exactly what failed and where without parsing logs by hand.

Together these properties make `native-update` something you can put in a critical path and not worry about. Errors are events, not crises.

## Where to go next

- [SDK Reference → Security → Error Codes](/reference/sdk/security/error-codes) — the full enum of typed error codes.
- [Roll back a bad bundle](/how-to/roll-back-bundle) — what to do when a bundle gets past verification but breaks at runtime.
- [Architecture](./architecture) — the boundaries between SDK code, native code, and backend code where errors propagate.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
