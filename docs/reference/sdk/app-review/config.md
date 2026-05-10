---
sidebar_position: 3
title: App Review — Config
description: Field-by-field reference for AppReviewConfig — every option that controls App Review throttling, custom triggers, debug mode, and web fallback URL.
keywords: [AppReviewConfig, native-update review config, minimumDaysSinceInstall, customTriggers, webReviewUrl]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# App Review — Config

`AppReviewConfig` controls the plugin-side throttles that sit on top of the platform's own caps. Pass it under `appReview` when calling `NativeUpdate.initialize()`.

```typescript
import type { AppReviewConfig } from 'native-update';
```

---

## Full type

```typescript
interface AppReviewConfig {
  minimumDaysSinceInstall?: number;
  minimumDaysSinceLastPrompt?: number;
  minimumLaunchCount?: number;
  customTriggers?: string[];
  debugMode?: boolean;
  webReviewUrl?: string;
}
```

---

## Field reference

### `minimumDaysSinceInstall`

| | |
|---|---|
| Type | `number` (days) |
| Required | no |
| Default | `7` |

The smallest gap between first install and the first review prompt. Apple [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) recommend not prompting in the first week — this default mirrors that recommendation. Set lower for utility apps with very short engagement cycles, higher for habit / fitness apps where 7 days is too soon.

```typescript
minimumDaysSinceInstall: 14   // wait two weeks
```

---

### `minimumDaysSinceLastPrompt`

| | |
|---|---|
| Type | `number` (days) |
| Required | no |
| Default | `90` |

The smallest gap between any two prompts. The default of 90 days approximates Apple's silent 3-per-365 cap (365 / 3 ≈ 121, with a margin) — staying under it ensures you never get throttled by iOS without knowing.

---

### `minimumLaunchCount`

| | |
|---|---|
| Type | `number` |
| Required | no |
| Default | `3` |

The smallest number of app launches before a prompt can fire. Filters out users who installed once and never came back.

---

### `customTriggers`

| | |
|---|---|
| Type | `string[]` |
| Required | no |
| Default | `[]` |

Names of custom triggers that must have fired at least once before the prompt is allowed. Use this to gate prompts behind real happiness signals — for example:

```typescript
customTriggers: ['purchase_complete', 'nps_positive']
```

Then your code emits each trigger once at the right moment:

```typescript
// (Trigger emission API ships with the Background Update + analytics
// reference in Batch 4. Until then, your app's own analytics layer can
// store these triggers in @capacitor/preferences directly.)
```

If `customTriggers` is non-empty, **all** of them must have fired before [`canRequestReview()`](./methods#canrequestreview) returns `canRequest: true`.

---

### `debugMode`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `true`, plugin-side throttles are bypassed entirely. The platform's own quotas (Apple's 3-per-365, Google's hidden quota) still apply — `debugMode` cannot subvert those.

Set to `true` in development builds, never in production:

```typescript
debugMode: import.meta.env.DEV
```

---

### `webReviewUrl`

| | |
|---|---|
| Type | `string` |
| Required | recommended for cross-platform coverage |
| Default | — |

Fallback URL for platforms / scenarios where the native prompt is unavailable (web app, Huawei without GMS, jailbroken iOS without StoreKit, kiosk-mode devices). When [`requestReview()`](./methods#requestreview) cannot show the native sheet, the plugin opens this URL in a new tab / Safari View Controller.

Use the deep link to your store's review screen:

```typescript
webReviewUrl: 'https://apps.apple.com/app/id1234567890?action=write-review'
// or for Android:
webReviewUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.yourapp&showAllReviews=true'
```

---

## Recommended production config

```typescript
const appReview: AppReviewConfig = {
  minimumDaysSinceInstall: 7,
  minimumDaysSinceLastPrompt: 120,           // a bit more conservative than the default
  minimumLaunchCount: 5,
  customTriggers: ['onboarding_complete'],   // only after positive engagement
  debugMode: false,
  webReviewUrl: 'https://apps.apple.com/app/id1234567890?action=write-review',
};
```

## Recommended development config

```typescript
const appReview: AppReviewConfig = {
  minimumDaysSinceInstall: 0,
  minimumDaysSinceLastPrompt: 0,
  minimumLaunchCount: 0,
  debugMode: true,                           // skip every plugin-side throttle
};
```

:::warning iOS still throttles in development
`debugMode: true` only bypasses the **plugin's** throttles. iOS itself still always shows the sheet in dev / TestFlight builds, but in production iOS enforces the 3-per-365 cap regardless of plugin config.
:::

---

<div className="nu-author-card">
Config reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-10</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
