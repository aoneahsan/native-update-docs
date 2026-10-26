---
sidebar_position: 2
title: Plans, limits and update delivery
description: What happens on the hosted Native Update service when an account goes over its plan's app or monthly active user limit, how update delivery pauses after a 7-day grace period, and what your app's users see.
keywords: [native-update plans, monthly active users limit, ota update paused, billing hold, native-update held]
last_update:
  date: 2026-10-26
  author: Native Update team
---

# Plans, limits and update delivery

The hosted Native Update service has three plans. Free includes every feature with 30 apps and 5,000 monthly
active users; Pro and Team raise the limits. Current prices and limits are on the
[pricing page](https://nativeupdate.aoneahsan.com/pricing). A monthly active user is a distinct device that
checked for updates in the calendar month.

This page is about the hosted service only. A server you run yourself never sends any of this.

## When an account goes over its limit

Once a day the service compares each account with its plan's app and monthly-active-user limits.

**From the first day over:**

- New uploads, promotions and wider rollouts are refused with HTTP `402` and the code `PLAN_LIMIT`. You can still
  narrow or pause a rollout.
- Devices keep receiving the release they are on, and any rollout already in progress.
- You get an email, and the billing page shows the date delivery pauses.

**After 7 days over the limit:** update delivery pauses. Devices are told that an update exists, but no bundle
is served until you upgrade or get back under the limit. Your apps keep running the bundle they have. Delivery
resumes on the next check after the account is back within its plan.

A paid plan that ends returns the account to Free. Nothing is deleted. If the account is then over the Free
limits, the same steps apply.

## What your app's users see

From plugin 4.2.0, `checkForUpdate()` and `getLatest()` report the pause, so you can tell your users why the
update they were promised has not arrived:

```ts
const result = await NativeUpdate.checkForUpdate();

if (result.held) {
  // A newer release (result.latestVersion) exists; delivery is paused on the developer's account.
  showBanner(result.heldMessage);
}
```

`available` stays `false` while the update is held, so nothing is downloaded. Older plugin versions read the
same answer as "no update". The wire shape is in the [API contract](./api-contract).
