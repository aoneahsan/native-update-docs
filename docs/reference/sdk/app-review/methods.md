---
sidebar_position: 2
title: App Review — Methods
description: Reference for the two App Review API methods in native-update — requestReview and canRequestReview. Includes signatures, return types (ReviewResult and CanRequestReviewResult), and a complete usage pattern.
keywords: [requestReview, canRequestReview, ReviewResult, CanRequestReviewResult, native-update app review methods]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Review — Methods

Two methods, two return types. Signatures verbatim from `src/definitions.ts`.

```typescript
import { NativeUpdate } from 'native-update';
import type { ReviewResult, CanRequestReviewResult } from 'native-update';
```

---

## `canRequestReview()` {#canrequestreview}

```typescript
canRequestReview(): Promise<CanRequestReviewResult>
```

Cheap pre-flight check. Returns whether **all** plugin-side throttles ([config](./config)) currently allow a review prompt. Does **not** call the platform — it cannot know about Apple's silent 3-per-365 cap.

**Returns** [`CanRequestReviewResult`](#canrequestreviewresult).

```typescript
const { canRequest, reason } = await NativeUpdate.canRequestReview();

if (!canRequest) {
  console.log('[review] gate not met:', reason);
  return;
}
await NativeUpdate.requestReview();
```

When `canRequest` is `false`, the `reason` field tells you which gate failed:
- `'minimumDaysSinceInstall'` — too soon since first install
- `'minimumDaysSinceLastPrompt'` — too soon since the last prompt
- `'minimumLaunchCount'` — too few app launches
- `'customTriggerNotMet'` — your custom trigger has not fired
- `'platformNotSupported'` — the platform cannot show a native prompt (e.g. desktop web)

---

## `requestReview()` {#requestreview}

```typescript
requestReview(): Promise<ReviewResult>
```

Triggers the native review sheet. Calls `SKStoreReviewController.requestReview` on iOS and `ReviewManager.launchReviewFlow` on Android. The platform decides whether the user actually sees a sheet — neither API exposes that signal.

**Returns** [`ReviewResult`](#reviewresult). The `displayed` field is best-effort: it is `true` when the platform call returned without error, **not** a confirmation that the sheet was visible.

**Throws** `REVIEW_NOT_SUPPORTED` (Play Services missing on Android, jailbroken iOS without StoreKit), `CONDITIONS_NOT_MET` (plugin-side throttle blocked the call — same reasons `canRequestReview()` returns `false`).

```typescript
try {
  const result = await NativeUpdate.requestReview();
  if (result.displayed) {
    console.log('[review] prompt fired (display not guaranteed)');
  } else {
    console.log('[review] declined to show:', result.reason);
  }
} catch (e) {
  // Falls through to the web fallback URL (config.webReviewUrl)
  console.error('[review] failed', e);
}
```

### Recommended call site

After a positive user signal — payment success, onboarding complete, sharing the app, an NPS-9 answer:

```typescript
async function maybeAskForReview() {
  const { canRequest } = await NativeUpdate.canRequestReview();
  if (!canRequest) return;
  await NativeUpdate.requestReview();
}

// Inside your "checkout success" handler:
await trackPurchase(...);
await maybeAskForReview();   // best-effort; never blocks the success UI
```

Never `await` a review call inline with critical user flows — wrap it in a fire-and-forget that catches all errors. A failed review attempt should never break a purchase confirmation.

---

## Return types

### `ReviewResult` {#reviewresult}

| Field | Type | Required | Description |
|---|---|---|---|
| `displayed` | `boolean` | yes | Best-effort. `true` when the platform call returned without error. **Not** a confirmation that the user saw the sheet — neither Apple nor Google exposes that signal. |
| `error` | `string` | no | Human-readable error if the platform call failed. |
| `reason` | `string` | no | If `displayed: false`, why. Same set of values as [`CanRequestReviewResult.reason`](#canrequestreviewresult). |

### `CanRequestReviewResult` {#canrequestreviewresult}

| Field | Type | Required | Description |
|---|---|---|---|
| `canRequest` | `boolean` | yes | `true` if all plugin-side throttles currently allow `requestReview()`. |
| `reason` | `string` | no | When `canRequest: false`, identifies which gate failed. |

---

## Common errors

| Code | When | What to do |
|---|---|---|
| `REVIEW_NOT_SUPPORTED` | Play Services missing (Huawei, F-Droid, no-GMS Android), iOS without StoreKit, web without `webReviewUrl` | Fall back to opening `webReviewUrl` in a browser. |
| `CONDITIONS_NOT_MET` | Plugin-side throttle blocked the call | Skip silently; respect the throttle. |
| `QUOTA_EXCEEDED` | Some platforms surface this when their internal cap is exhausted | Skip silently; quota resets eventually. |

The full code list ships with the security reference in **Batch 4**.

---

<div className="nu-author-card">
Method reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
