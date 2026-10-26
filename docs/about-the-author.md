---
sidebar_position: 99
slug: /about
title: About Native Update
description: Native Update is a SaaS product for Capacitor apps, built and maintained by the Native Update team. How to reach us, and how the plugin is licensed.
keywords: [Native Update, native-update, Capacitor OTA updates, Native Update team, Native Update License]
last_update:
  date: 2026-10-26
  author: Native Update team
---

# About Native Update

Native Update ships a signed fix to every installed copy of your Capacitor app without waiting for store review, and tells you who has it. It's a SaaS product: a hosted service (dashboard, API, CLI) where you upload signed bundles, roll them out by percentage and pick a plan, plus the npm plugin [`native-update`](https://www.npmjs.com/package/native-update) your app installs to receive them.

Live updates carry web-layer changes; native changes still ship through the store.

The Native Update team builds and maintains the service, the plugin and this documentation.

## Reach us

| Need | Where |
|---|---|
| A question, a bug or a gap in these docs | [Contact page](https://nativeupdate.aoneahsan.com/contact) |
| Plans and pricing | [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com) |
| The package | [npmjs.com/package/native-update](https://www.npmjs.com/package/native-update) |

## License

From version 4.1.2, the `native-update` package ships under the proprietary Native Update License, included in the package as `LICENSE`. You may install it and use it, without charge, inside the apps you build, to receive updates from the Native Update service or from your own server that implements the [documented update contract](/backend/api-contract). Versions published before 4.1.2 keep the license they were published with. Use of the hosted service, dashboard, API and CLI is governed by the [Terms of Service](https://nativeupdate.aoneahsan.com/terms).

Native Update is not open source. The product source is private; this documentation site is the public reference.
