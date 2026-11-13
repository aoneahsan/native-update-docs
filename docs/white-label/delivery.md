---
sidebar_position: 2
title: What a white-label license delivers
description: The two parts you can license — the dashboard and update server, and the native-update plugin and CLI in your customers' apps — and what the Native Update team runs for each.
keywords: [white label ota dashboard, white label update server, native-update plugin license, capacitor ota for agencies]
last_update:
  date: 2026-11-13
  author: Native Update team
---

# What a white-label license delivers

A license covers the parts you choose on the [pricing page](https://nativeupdate.aoneahsan.com/white-label/pricing).
Today there are two.

## Dashboard and update server

The hosted half of Native Update, run under your name:

- **Your domains.** The dashboard and the update API answer on domains you choose, for example
  `releases.your-company.com` and `updates.your-company.com`, with HTTPS on both.
- **Your name and colors.** Your logo, product name and colors on the dashboard, its sign-in page and the emails it
  sends.
- **Your customers' accounts.** They sign in, create apps, upload signed bundles, roll them out by percentage, watch
  failed starts and roll back, the same way they would on Native Update. Their apps and releases live in your
  deployment.
- **Hosting and releases.** We host the server, apply each Native Update release to it, and watch it.

## Plugin and CLI

The part that sits inside your customers' apps:

- They install the same `native-update` package from npm and point it at your server:

  ```ts
  await NativeUpdate.initialize({
    appId: 'their-app-id',
    serverUrl: 'https://updates.your-company.com/api',
    requireSignature: true,
    channel: 'production',
  });
  ```

- The CLI ships their releases to your server from CI with `--server` or `NATIVE_UPDATE_SERVER`:

  ```bash
  NATIVE_UPDATE_SERVER=https://updates.your-company.com/api \
  NATIVE_UPDATE_TOKEN=nu_pat_... \
  npx native-update deploy dist --app their-app-id --wait
  ```

- We keep publishing the package under its own name. A license doesn't rename it or publish a copy.

Live updates carry web-layer changes; native changes still ship through the store. That stays true under any name.

## Not included

- Source code. That comes only with the [buyout](https://nativeupdate.aoneahsan.com/white-label/buyout).
- Changes made only for you. Those are [custom work](https://nativeupdate.aoneahsan.com/white-label/custom-work),
  quoted separately.
- Costs you choose yourself, such as your domain or paid services you add.
