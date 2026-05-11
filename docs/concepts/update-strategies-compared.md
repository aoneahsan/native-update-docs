---
sidebar_position: 3
title: Update strategies compared
description: A side-by-side comparison of the four update strategies native-update offers — immediate, on-app-start, on-app-resume, and background — covering when each fires, what the user sees, the trade-offs, and which to default to.
keywords: [native-update update strategies, ota immediate vs background, capacitor on-app-start update, update timing strategies, native-update updateStrategy]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Update strategies compared

`native-update` lets you choose **when** a downloaded bundle applies, not just whether one is available. The choice has user-visible consequences — some strategies make the app pause mid-session to reload, others wait quietly until the user next opens the app. This page lays the four options side by side so you can pick deliberately rather than by accident.

The short answer: most apps should default to `on-app-start` (the user reopens the app and the new bundle is already live, with no perceptible delay) and use `immediate` only for mandatory security patches. Background updates are a layered concern on top — they pre-download bundles before the user-facing strategy fires, regardless of which one you picked.

## The four strategies at a glance

| Strategy | When does the new bundle become active? | User experience | When to use |
|---|---|---|---|
| `immediate` | The moment the download + verify completes, mid-session | App reloads, current state is lost | Critical security patch where the old code is dangerous; user-initiated "Apply update now" buttons |
| `on-app-start` | Next time the app launches from cold start | Invisible — the user just sees the new version on opening | **Default for almost all apps** |
| `on-app-resume` | Next time the app comes back to the foreground (any resume, including a 2-second background-and-back) | Brief reload on focus return; can feel jarring | Long-lived apps where users rarely cold-start (foreground for hours, never quit) |
| `manual` | Only when your code explicitly calls `NativeUpdate.reload()` after `downloadUpdate()` | Whatever your UI says — typically a "Reload to apply" button | Apps that need a "save your work first" prompt before applying |

Pick one of these as the default in `native-update.config.js`; override per-call when you need to.

## `immediate` — apply right now

`updateStrategy: 'immediate'` calls `reload()` automatically as soon as `downloadUpdate()` completes and the bundle has been staged + verified. The WebView swaps to the new bundle while the user is potentially mid-tap.

This is the strongest signal to "make sure the user gets the new code as soon as possible." It is also the most disruptive: any unsaved form state, mid-scroll position, expanded modal — all gone. The user has no way to know what just happened beyond a sudden re-render.

Three legitimate use cases for `immediate`:

The bundle contains a security fix and the old code is actively dangerous. The reload is the cost of getting the fix to the device today.

The bundle is being installed via a user-initiated "Apply update now" tap. The user explicitly asked for it, so the reload is expected.

The app has no meaningful in-session state to lose — a video player, a kiosk, a passive content feed. The reload-mid-session cost is approximately zero.

If your case isn't one of these three, pick something else. `immediate` shipped at 4 PM on a Friday is the textbook OTA support ticket.

## `on-app-start` — apply on next cold start

`updateStrategy: 'on-app-start'` (also written as `'IMMEDIATE'` in some older versions, confusingly — the JS API and the enum diverge slightly; check [SDK Reference → Live Update → Enums](/reference/sdk/live-update/enums)) marks the bundle as pending after download and applies it when the app next cold-starts. "Cold start" means the OS killed the app process and the user re-launched — typically after closing all apps, switching devices, or the OS reclaiming memory under pressure.

What the user sees: nothing different at all. They reopen the app on Tuesday morning, the SDK swaps the bundle during boot, the home screen renders from the new bundle. The first thing they notice is whatever you changed.

This is the right default for almost every consumer app. Apps get cold-started naturally — most users foreground-resume a few times then eventually cold-start, intentionally or because the OS reclaimed memory. The bundle is in place; whatever new code is ready when they next look.

The downside is that users who background-resume indefinitely never get the new bundle. A user who keeps your app in the foreground every day and only ever resumes (never closes-then-relaunches) will stay on the old bundle forever. In practice this is rare; iOS and Android both reclaim long-suspended apps under memory pressure, forcing a cold start. But for power users or pinned-to-foreground use cases, consider `on-app-resume` or a max-staleness threshold enforced in your own code.

## `on-app-resume` — apply when the app returns to foreground

`updateStrategy: 'on-app-resume'` applies the pending bundle on the next `appStateChange` event where the app moves from background to foreground. That's a much more frequent trigger than cold-start — any time the user switches to another app and comes back, the SDK swaps.

The user sees a very brief reload (~200ms-1s depending on the bundle size and the device). If you only context-switched away for a moment to check a notification, this can feel like the app glitched. If you've been gone an hour and forgot the app was even open, the reload is barely noticeable.

The right use case is long-lived apps where cold starts are rare:

A messaging app foregrounded all day. The user switches apps frequently but never quits. `on-app-resume` ensures they get the new bundle within minutes of your release, not weeks.

A health-tracking app whose process is kept alive by background-sensor permissions. Cold-starts effectively never happen. `on-app-resume` is the only practical user-facing apply path.

The cost is that any brief context-switch costs the user a tiny reload. Test it on a real device with your actual bundle size before committing — apps with large bundles (5+ MB) make `on-app-resume` feel laggy.

## `manual` — your code decides when

`updateStrategy: 'manual'` makes the SDK download and stage the bundle but never apply it on its own. You call `NativeUpdate.reload()` from your own code to trigger the swap.

This is the most powerful and the most labor-intensive. You get to control the apply moment exactly — show a "Reload to apply" toast, gate behind a settings-page button, wait for an idle-detector to signal that the user is between actions. The trade-off is that you have to write that UX.

Three real patterns for `manual`:

The "save your work, then update" pattern. Your app has unsaved state (a draft email, an in-progress form). Don't ship the new bundle until the user has saved. After `downloadUpdate()` resolves, check the draft state; when the user finishes, show a "Apply update?" toast.

The "update tonight" pattern. Pre-download the bundle when the user opens the app; apply at next launch by calling `reload()` from a `didReceiveMemoryWarning` or `app-backgrounded-for-N-minutes` handler. The user gets a smooth experience and the update lands at a low-cost moment.

The "tell-the-user-and-let-them-decide" pattern. A persistent banner: "A new version is ready. [Apply] [Later]." Common for productivity apps where reload-during-work is unacceptable.

## Background updates — orthogonal to all four

The strategies above describe **when the user-facing apply happens**. Background updates describe **when the download happens**. The two are orthogonal: you pick a strategy AND independently enable background pre-download.

With background updates enabled (`NativeUpdate.enableBackgroundUpdates()`), the OS-scheduled background-task wakes the app at quiet moments (overnight, on charger, on WiFi), runs the check, downloads + verifies the bundle, and stages it. By the time your user opens the app and your `sync()` runs, the bundle is already on disk. The user-facing apply strategy then takes over and decides when to swap.

This is the gold-standard configuration for consumer apps:

```js
{
  updateStrategy: 'on-app-start',
  // also call NativeUpdate.enableBackgroundUpdates() once on first launch
}
```

The user never sees a download progress indicator — by the time they open the app, the new bundle is staged and the on-app-start swap is instant. See [SDK Reference → Background Update → Overview](/reference/sdk/background-update/overview) for the OS-scheduling caveats (Android WorkManager constraints, iOS BGTaskScheduler discretion).

## A decision tree

If you don't want to read the prose above and want a one-line recommendation:

If your app has critical security implications when running old code, use `immediate` for those specific bundles (via the SDK's per-call override) and `on-app-start` for everything else.

If your app has unsaved-state concerns (drafts, forms, in-progress work), use `manual` and build the "ready to update?" UX explicitly.

If your app is long-lived foreground (messaging, tracking, dashboards) and cold-starts are rare, use `on-app-resume`.

For everything else — the default consumer app — use `on-app-start` with background updates enabled.

## What's not in the model

Two timing controls people sometimes expect that the plugin does not currently provide:

A "minimum age before apply" delay. "Apply this bundle, but not for at least 24 hours after download, so I can pull it back if it's bad." The SDK applies as soon as the strategy fires. The closest equivalent is a percentage rollout — see [Manage release channels](/how-to/manage-channels) — which limits the cohort that gets the bundle in the first place, and [Roll back a bad bundle](/how-to/roll-back-bundle) for the recall path.

A "must-apply by" deadline. "After 14 days, force apply even if the user keeps backgrounding." The SDK respects the configured strategy indefinitely. Implement this in your own code by tracking the last successful `sync()` against today's date and calling `NativeUpdate.reload()` when the gap exceeds your threshold.

Both are on the maintainers' wishlist; file an issue with the use case if you need either.

## Where to go next

- [How OTA updates work](./how-ota-updates-work) — the lifecycle these strategies plug into.
- [SDK Reference → Live Update → Config](/reference/sdk/live-update/config) — the field-by-field `updateStrategy` definition.
- [SDK Reference → Background Update → Overview](/reference/sdk/background-update/overview) — the background-pre-download pairing.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
