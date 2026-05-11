---
sidebar_position: 3
title: Web Platform Guide
description: What native-update can and cannot do when running in a browser, the service-worker-based update fallback, and when the web target is actually useful (browser dev fallback for Capacitor, PWA-style update prompts, automated tests).
keywords: [native-update web, capacitor web ota, native-update browser, service worker updates capacitor, pwa update prompt]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Web Platform Guide

`native-update` runs in a browser too. The web implementation (`src/web.ts` in the plugin source) ships as part of the Capacitor plugin and activates whenever your app runs outside a native shell — your dev server, a deployed PWA, a Playwright headless run. This page documents what works, what is stubbed, and when the web target is actually useful. Read it before assuming the web path mirrors iOS / Android.

The short version: the web target exists primarily so your code that calls `NativeUpdate.sync()` doesn't crash in the browser during development. It also provides a service-worker-aware update path for genuinely web-deployed Capacitor apps, but the surface is much smaller than native — most methods either throw `PLATFORM_NOT_SUPPORTED` or return a sensible no-op default.

## When the web target activates

Capacitor's platform detection picks the implementation at runtime. `Capacitor.getPlatform()` returns `'web'` when:

You run `yarn dev` (Vite, Webpack, etc.) and hit `http://localhost:5173` in a browser. The Capacitor bridge is absent so `WebPlugin` instances handle every call.

You build for the `webDir` and deploy the static assets as a PWA to Firebase Hosting, Vercel, Netlify, etc. The same `WebPlugin` runs in production browsers.

A headless test runner (Playwright, Cypress, Puppeteer) executes your app in a real browser context. Same path — no native bridge.

The web target does NOT activate when the app runs inside `capacitor://` or `https://localhost` (the schemes Capacitor uses inside iOS / Android shells). Those routes hit the iOS or Android implementation via the bridge.

## What works on web

The web implementation provides functional implementations for these methods:

`configure(options)` — validates and persists the plugin config into `localStorage`. Same surface as native. Throws if the configured `baseUrl` is not HTTPS, except for `http://localhost` / `http://127.0.0.1` for development.

`getSecurityInfo()` — returns the configured signing-key fingerprint and cipher suite. Useful for diagnostics; the value reflects the JS-side `publicKey` config.

`current()`, `list()`, `delete()` — bundle inventory backed by an in-memory `Map<bundleId, BundleInfo>` that persists to `localStorage`. You can simulate a multi-bundle history in the browser for testing the SDK's rollback flow.

`notifyAppReady()` — marks the current bundle as "verified" in the local map and saves. Identical contract to native: skip and the bundle stays in "pending" state.

`reload()` — calls `window.location.reload()`. The closest web analogue of the native "apply bundle and restart" semantics, since the bundle is just static assets the browser caches.

`setChannel(channel)` — persists the channel into the config map.

`getLatest()` — returns `{ available: true, version: 'web-update', notes: 'Service worker update available' }` when `navigator.serviceWorker.getRegistration().waiting` is non-null, otherwise `{ available: false }`. This is the only meaningful "is there an update" signal the browser can offer.

`openAppStore(options)` — opens `appUpdate.storeUrl.android` / `appUpdate.storeUrl.ios` (whichever is set first) in a new tab via `window.open(url, '_blank')`. Throws `INVALID_CONFIG` if neither is configured.

`requestReview()` — returns `{ displayed: false, error: '<reason>' }` after running the same throttling logic as native (launches, days, last-prompt). Web has no native review-prompt API; the throttling logic is here so calling code can build its own fallback UI conditionally.

## What's stubbed

The native app-update flow has no meaningful web analogue. Every method below throws `PLATFORM_NOT_SUPPORTED` with `'App updates are not supported on web platform'`:

`getAppUpdateInfo()`, `performImmediateUpdate()`, `startFlexibleUpdate()`, `completeFlexibleUpdate()`. The reason: browsers don't have an "app store binary"; the only update surface is the static assets, which the live-update API already covers.

Listener-based events emit through Capacitor's `WebPlugin` base — your `addListener('downloadProgress', cb)` calls work, but no native events fire because there is no native worker. You can dispatch your own `notifyListeners('downloadProgress', payload)` from a service-worker `message` handler to simulate native events.

## The service-worker update path

The plugin's web `getLatest()` returns `available: true` whenever a service-worker update is waiting. To wire this into a real PWA update flow:

```ts
// 1. Register your service worker as usual.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// 2. Tell native-update to check on a schedule.
import { NativeUpdate } from 'native-update';

setInterval(async () => {
  const latest = await NativeUpdate.getLatest();
  if (latest.available) {
    // 3. Prompt the user; on confirm, activate the waiting SW.
    if (confirm('Update available. Reload now?')) {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
}, 60_000);
```

In your service worker:

```js
// sw.js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(clients.claim())
);
```

This pattern reuses `native-update`'s SDK surface for PWAs without ever calling the OTA bundle download flow. You don't get bundle signing or atomic rollback — the browser's service worker is the update primitive — but you get a uniform API across iOS / Android / Web for "is there a newer version".

## When to use the web target

There are three legitimate use cases for the web target. None of them is "ship OTA-style bundle updates to web users" — for that, deploy a new static bundle via your normal hosting and let HTTP caching handle the rest.

**Development against `yarn dev`.** Your Capacitor app's startup code calls `NativeUpdate.sync()` and `NativeUpdate.notifyAppReady()`. Without a web implementation, those calls throw `Plugin not implemented` in the browser and your dev server breaks. The web target lets the calls succeed with sensible defaults so your app boots in the browser.

**PWA deployments of a Capacitor app.** If you ship your Capacitor app as both a native bundle (Play Store, App Store) and a PWA (Firebase Hosting, Vercel), the web target gives you a unified update-prompt API. Native users get OTA bundles; web users get the service-worker "new version available" flow through the same `NativeUpdate.getLatest()` call.

**E2E tests.** Playwright / Cypress run your app in a real browser. Mocking the plugin via the test framework's mock system works but is brittle; using the web implementation means the same code paths exercise the same `WebPlugin` event-listener wiring in tests and production.

## When NOT to use the web target

Do not use it to ship OTA-style bundle updates to browser users. The plugin's web `sync()` does not download a ZIP, unpack it, swap assets, or do anything resembling the native flow — it walks through a no-op state machine and returns `SyncStatus.UP_TO_DATE`. Browser caching plus a new deploy is the right tool for "update web users".

Do not use it to test the native bundle-signing / verification flow. The web implementation has the signature-verification code paths (`SubtleCrypto.verify`) but they only fire when you manually invoke them with a fully signed bundle — there is no automatic bundle-download orchestration for them to plug into. Test signing on a real device.

Do not use it as a Node.js polyfill. `WebPlugin` requires `window`, `document`, `localStorage`, and `navigator` — running the plugin under Node without a JSDOM-like environment fails at import time.

## Configuration that affects the web path

Most of `LiveUpdateConfig` has no effect on web. The fields that do matter:

`baseUrl` — must be HTTPS (or `localhost` / `127.0.0.1`). Web's `configure()` throws on plain `http://` in production for the same reason native does: a mid-stream replacement of your app's code is a credential-theft vector.

`channel` — persists into `localStorage` so service-worker checks honour the channel. Useful for separate dev / staging / prod service-worker scopes.

`publicKey` — written into `getSecurityInfo()` output. The web path doesn't currently use it to verify a signature against a downloaded bundle (there is no bundle download), but the API surface keeps parity with native.

`appUpdate.storeUrl.{ios,android}` — drives `openAppStore()`. Setting one means `openAppStore()` on web opens the corresponding store page in a new tab; useful when you want a "Get the mobile app" CTA on your web build.

## Browser support

The web target works on every browser that supports `localStorage`, `fetch`, `crypto.subtle`, and `navigator.serviceWorker` — every evergreen browser since 2018. IE 11 is unsupported (no `crypto.subtle` in production-usable form). Safari 11+, Chrome 60+, Firefox 60+, Edge 79+ all pass.

The service-worker integration depends on browser support for `serviceWorker.getRegistration().waiting` and the `SKIP_WAITING` message pattern — every browser that supports service workers supports this.

## Smoke testing on web

```bash
yarn dev
# Open http://localhost:5173 in any modern browser.
# In the browser console:
import('native-update').then(async (m) => {
  await m.NativeUpdate.configure({ config: { baseUrl: 'https://example.com' } });
  console.log(await m.NativeUpdate.getLatest());   // { available: false } unless SW waiting
  console.log(await m.NativeUpdate.current());     // BundleInfo for the default bundle
});
```

If the import fails, your bundler is tree-shaking the web implementation — make sure `native-update` is in `dependencies` (not `devDependencies`) and that your bundler hasn't excluded `src/web.ts` via a module-resolution rule.

## Next steps

- Read [Android Platform Guide](./android) and [iOS Platform Guide](./ios) — the surfaces where the real OTA work happens.
- For PWA-style updates, the [`native-update` SDK Reference → Live Update → Overview](/reference/sdk/live-update/overview) covers the cross-platform `getLatest()` semantics.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
