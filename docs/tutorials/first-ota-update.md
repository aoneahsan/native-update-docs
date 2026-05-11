---
sidebar_position: 1
title: Your first OTA update — end to end
description: A step-by-step walkthrough from a fresh Capacitor project to a verified OTA update applied on a real device. Covers install, signing-key generation, bundle creation, signing, upload, the device-side sync, and verifying the new bundle ran.
keywords: [native-update tutorial, capacitor ota tutorial, first ota update, native-update getting started, capacitor live update setup]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Your first OTA update — end to end

By the end of this tutorial you will have published a single change to a running app over the air and watched the device pick it up. The path takes ~30 minutes if you already have a Capacitor app, plus another ~30 minutes if you are starting fresh. You will use the hosted Native Update SaaS for the backend — the same flow works for self-hosted Laravel or your own backend with one config change.

This tutorial is the "happy path." It deliberately glosses over channels, rollouts, key rotation, and CI — each of those gets its own how-to in this section. Read this once, get it working, then come back for the production-grade details.

## What you will build

A Capacitor app whose web bundle is updatable without a Play Store / App Store release. When you push a JS change, every running device fetches and applies it on next launch — typically within 30 seconds of opening the app.

You need: Node 18+, Yarn or npm, an Android or iOS device (or simulator), a Capacitor 6+ project (the tutorial uses `@capacitor/core@6` or newer), and a free account on [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com).

## Step 1 — Install the plugin

From your Capacitor app's root:

```bash
yarn add native-update
npx cap sync
```

If your project does not have native folders yet, run `npx cap add android` and `npx cap add ios` first. The `sync` command links the plugin into both platforms.

## Step 2 — Generate a signing keypair

Bundles are signed with your private key and verified on-device with the matching public key. The CLI generates a fresh pair locally:

```bash
npx native-update keys generate --type rsa --size 4096
```

Two PEM files appear under `./keys/`:

- `private-<timestamp>.pem` — used by your build pipeline to sign bundles. **Never commit.** Add `keys/private-*.pem` to `.gitignore` immediately.
- `public-<timestamp>.pem` — used by the SDK on device to verify bundles. Safe to commit.

Open the public-key file and copy its contents.

## Step 3 — Scaffold the SDK config

Create `native-update.config.js` in your project root:

```js
export default {
  appId: 'com.example.myapp',
  serverUrl: 'https://nativeupdatebe.aoneahsan.com',
  channel: 'production',
  autoUpdate: true,

  publicKey: `-----BEGIN PUBLIC KEY-----
PASTE-PUBLIC-KEY-CONTENTS-HERE
-----END PUBLIC KEY-----`,

  updateStrategy: 'immediate',
  checkInterval: 60 * 60 * 1000,
};
```

Replace `appId` with your real Capacitor app ID (the one in `capacitor.config.ts`). Replace the placeholder with the contents of `public-<timestamp>.pem` from Step 2.

Or run `npx native-update init --example` and answer the prompts for an interactive version of this step.

## Step 4 — Wire the SDK into your app's boot code

In your app's entry file (e.g. `src/main.ts`):

```ts
import { NativeUpdate } from 'native-update';
import config from '../native-update.config.js';

async function bootstrapOta() {
  await NativeUpdate.configure({ config: { liveUpdate: config } });

  // Tell the SDK the new bundle worked. Skipping this leaves the
  // bundle in "pending" state and the next bundle never applies.
  await NativeUpdate.notifyAppReady();

  // Check for an update and apply it on next launch.
  const result = await NativeUpdate.sync();
  console.log('[ota] sync result:', result.status);
}

bootstrapOta().catch((e) => console.error('[ota] boot failed', e));
```

The `notifyAppReady()` call is what flips a freshly-applied bundle from "pending" to "verified." Without it the SDK rolls back to the previous bundle on the next launch, assuming the new one crashed.

## Step 5 — Sign up on the SaaS and create your app

Open [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com), sign in with Google, and click **Create app**. Use the same `appId` from Step 3 (`com.example.myapp`). The dashboard creates the app row and shows you a new API key — copy it now, you cannot retrieve it later.

Add the API key to `native-update.config.js`:

```js
export default {
  // ... previous fields
  apiKey: 'nu_prod_xxxxxxxxxxxxxxxxxxxxxx',
};
```

In the dashboard, navigate to **Signing keys → Add public key** and paste the contents of `public-<timestamp>.pem`. The dashboard stores it so the bundle-upload UI knows which key to expect signatures from.

## Step 6 — Build and bundle your app

Build your web app as normal:

```bash
yarn build
```

Then package the output:

```bash
npx native-update bundle create ./dist --version 1.0.0 --channel production
```

`./dist` should be your build output — adapt to wherever your bundler emits files. The command writes:

- `./update-bundles/bundle-1.0.0-<epoch>.zip` — the bundle ZIP
- `./update-bundles/bundle-1.0.0-<epoch>.json` — metadata with SHA-256 checksum, size, channel

## Step 7 — Sign the bundle

Sign with the private key from Step 2:

```bash
npx native-update bundle sign \
  ./update-bundles/bundle-1.0.0-*.zip \
  --key ./keys/private-*.pem
```

This writes a `.sig` sidecar next to the bundle and a `.signed.zip` copy. Run a sanity check before uploading:

```bash
npx native-update bundle verify \
  ./update-bundles/bundle-1.0.0-*.signed.zip \
  --key ./keys/public-*.pem
```

`✅ Bundle signature is VALID` means the keypair is consistent. If you see `INVALID`, the public key in your config does not match the private key you signed with — re-check Step 5.

## Step 8 — Upload the bundle

In the dashboard, open your app → **Builds** → **Upload build**. Drop the `.signed.zip` and `.sig` files. Set version `1.0.0`, channel `production`, mark "active." Click upload.

The dashboard validates the signature against the public key you registered in Step 5, then stores the bundle. Within ~10 seconds, the `/api/v1/updates/check` endpoint starts returning your bundle when devices ask.

## Step 9 — Install and verify on a device

Build and run your Capacitor app:

```bash
npx cap run android   # or: npx cap run ios
```

Watch the device log:

- Android: `adb logcat | grep native-update`
- iOS: Console.app filtered on your app name + `native-update`

You should see something like:

```
[native-update] sync started
[native-update] update available: 1.0.0
[native-update] downloading 1843921 bytes
[native-update] signature verified
[native-update] bundle marked pending — will apply on next launch
```

Close the app (swipe up to dismiss; not stop) and reopen it. The SDK now applies the bundle and calls your `notifyAppReady()` from Step 4. Confirm the bundle is verified:

```
[native-update] applying bundle 1.0.0
[native-update] notifyAppReady — bundle 1.0.0 marked verified
```

## Step 10 — Ship your first real update

Change one visible string in your web app — e.g. update a heading from "Welcome" to "Welcome ✨". Run:

```bash
yarn build
npx native-update bundle create ./dist --version 1.0.1 --channel production
npx native-update bundle sign  ./update-bundles/bundle-1.0.1-*.zip --key ./keys/private-*.pem
```

Upload `1.0.1` to the dashboard as before. On the device, close and reopen the app twice — first to trigger the sync, second to apply the downloaded bundle. The new string renders.

That's it. You just shipped an OTA update.

## What you did not do

This tutorial deliberately skipped: channel management (you only used `production`), rollouts (you shipped to 100% of users instantly), backend self-hosting (you used the SaaS), CI integration (you ran the CLI by hand), signing-key rotation, and rollback. Each one has its own how-to in this section.

## Next steps

- [Backend-first walkthrough](./backend-first-walkthrough) — the same flow with self-hosted Laravel instead of the SaaS.
- [Manage release channels](/how-to/manage-channels) — production vs staging vs beta.
- [Integrate with CI/CD](/how-to/ci-cd-github-actions) — automate steps 6–8 from this tutorial.
- [Test bundles in development](/how-to/test-bundles-locally) — iterate without uploading to the SaaS.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
