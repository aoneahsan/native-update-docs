---
sidebar_position: 6
title: Test bundles in development
description: Three local-test loops for OTA bundles — the bundle-verify smoke test, the native-update server start dev server, and the full-device LAN test. Covers what each one catches, what it doesn't, and when to use which.
keywords: [native-update local testing, ota dev server, capacitor bundle testing, native-update server start, ota lan testing]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Test bundles in development

You want to iterate on bundles without uploading every change to a real backend. Three local-test loops, in increasing fidelity:

| Loop | Catches | Skips | When to use |
|---|---|---|---|
| `bundle verify` smoke test | Keypair mismatches, bundle corruption | Everything device-side | After every `bundle sign` in CI or locally |
| `native-update server start` | Backend wire format, bundle metadata shape, JSON parser bugs | Native installation, rollback flow | Iterating on backend-side logic without a real backend |
| Full LAN test against your own backend | Native install, signature verification on device, rollback | App-store-specific gates (Play Console, App Review) | Pre-release validation |

Run them in order from fastest to slowest.

## Loop 1 — `bundle verify` smoke test (5 seconds)

After every `bundle sign`, run:

```bash
npx native-update bundle verify ./update-bundles/bundle-*.signed.zip --key ./keys/public-*.pem
```

A `✅ Bundle signature is VALID` proves three things: the public key matches the private key, the bundle bytes weren't corrupted post-signing, and the `.sig` sidecar parses. An `❌ INVALID` aborts further testing immediately — you would just be debugging the same mismatch on a device 10 minutes later.

This belongs at the end of your `bundle sign` step in every workflow, including CI. The example workflow in [Integrate with CI/CD](./ci-cd-github-actions) makes it a hard release gate.

What it doesn't catch: the bundle's actual JavaScript content. If you bundled the wrong dist directory or accidentally shipped your `node_modules`, the signature still verifies (it's a signature over bytes, not semantics). The CLI's `bundle create` refuses to bundle directories containing `node_modules` / `.git` / `.env*` as a safety net — see [CLI Reference → bundle create](/reference/cli/bundle-create).

## Loop 2 — Iterate against `native-update server start` (1-2 minutes per iteration)

For backend-side iteration without involving a real backend, run the bundled dev server:

```bash
npx native-update server start --port 5961 --dir ./update-bundles
```

The server serves bundles from the directory at the `--dir` path and exposes:

- `GET /api/latest?channel=production` — newest bundle's metadata + a `downloadUrl`
- `GET /api/bundles` — list of all bundle ZIPs
- `GET /bundles/<filename>` — the ZIP bytes
- `GET /health` — liveness check

Configure your app's `serverUrl` to point at this server:

```js
// native-update.config.js — development only
export default {
  // ...
  serverUrl: 'http://localhost:5961',
};
```

Open your Capacitor app in a browser (`yarn dev` of your web app) or a simulator and call `NativeUpdate.sync()` — the SDK fetches metadata from the dev server.

What it catches: that your bundle metadata JSON has the fields the SDK expects, that the SDK parses the response correctly, that the download URL works. Useful when developing a custom backend that should mimic this contract.

What it doesn't catch: native installation, signature verification on device (the dev server doesn't enforce signatures), the rollback flow. The dev server is a metadata server — it does not exercise the actual install path on a real device.

The dev server has no auth, no rate limiting, no signing-key verification. Do not expose it beyond `localhost` unless you have a specific local-LAN testing reason (see Loop 3).

## Loop 3 — Full LAN test against your own backend (5-10 minutes setup, fast iteration after)

For full-fidelity testing — including on-device signature verification and the actual install + rollback flow — run a real backend on your dev machine and point a real device at it.

### Step A — Run the Laravel reference backend

```bash
cd backend
php artisan serve   # uses SERVER_PORT=5946 from .env
php artisan queue:work   # in a second terminal
```

(See [Backend-first walkthrough](/tutorials/backend-first-walkthrough) for the full setup if you haven't done it.)

### Step B — Point your app at your LAN IP

On macOS:

```bash
ipconfig getifaddr en0
# → 192.168.1.42
```

On Linux:

```bash
ip route get 1 | awk '{print $7}'
# → 192.168.1.42
```

In `native-update.config.js`:

```js
export default {
  // ...
  serverUrl: 'http://192.168.1.42:5946',
};
```

### Step C — Allow cleartext on Android

Android 9+ blocks cleartext HTTP by default. For testing, add a network security config — see [Android Platform Guide → Network security configuration](/platforms/android#network-security-configuration). The recommended pattern allows cleartext only for your specific LAN range so production traffic still requires HTTPS.

### Step D — Allow local networking on iOS

iOS's App Transport Security requires an exception for local HTTP. In your host app's `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

This permits LAN HTTP traffic without permitting arbitrary internet HTTP. Strip it for App Store builds.

### Step E — Iterate

```bash
# In your app project:
yarn build
npx native-update bundle create ./dist --version 1.0.$BUILD_NUMBER --channel production
npx native-update bundle sign  ./update-bundles/bundle-*.zip --key ./keys/private.pem

# Upload via curl or Nova — see Backend → API Contract.
# Then on the device:
adb logcat | grep native-update
```

This is the same path as production. The only differences: the backend lives on your machine instead of a cloud server, and the network is LAN instead of the public internet. The SDK exercises the full install + verify + apply + notifyAppReady + rollback flow.

What it catches: every bug the production path would catch, plus device-specific issues (Android API levels, iOS versions, screen sizes).

What it doesn't catch: App Store / Play Store review gates (those only fire during store submission), production-scale traffic patterns, certificate-pinning configurations (your dev server has no TLS).

## Iteration speed tips

A few small things compound:

**Use Capacitor's live reload during web-only development.** `npx cap run android -l --external` reloads your web bundle on save without rebuilding the native shell. OTA testing is for testing the OTA mechanism specifically; for pure UI iteration, live reload is faster.

**Cache the `node_modules` between bundle iterations.** Running `yarn build` repeatedly is wasted time if you only changed one component — most bundlers (Vite, Webpack, Turbopack) cache builds. Don't `yarn clean` between iterations unless something is obviously wrong.

**Run the dev backend and dev server in `tmux` or `screen` sessions.** Both have to stay running for the duration of testing; tmux survives if your terminal crashes. Same applies to `adb logcat` and `tail -f` on the backend logs.

**Build a tiny "version visualizer" component in your app.** A floating widget that displays the current bundle version in the corner. Saves you logcat / Console.app trips during the install-and-verify loop — you see immediately whether the new bundle is live.

```tsx
import { useEffect, useState } from 'react';
import { NativeUpdate } from 'native-update';

export function VersionBadge() {
  const [version, setVersion] = useState('?');
  useEffect(() => {
    NativeUpdate.current().then((b) => setVersion(b.version));
  }, []);
  return process.env.NODE_ENV !== 'production'
    ? <div style={{position:'fixed',bottom:8,right:8,padding:'2px 8px',background:'#000a',color:'#fff',fontSize:12}}>{version}</div>
    : null;
}
```

## Verification

After each loop, confirm:

**Loop 1:** the verify step exits 0 in your terminal.

**Loop 2:** `curl http://localhost:5961/api/latest` returns the JSON shape you expect.

**Loop 3:** the device logs show `bundle marked pending` after `sync()` and `notifyAppReady — bundle marked verified` on next launch. If you see `SIGNATURE_VERIFICATION_FAILED`, your public key in `native-update.config.js` doesn't match the private key in `keys/`. Re-generate or copy the correct public key.

## Related

- [CLI Reference → server start](/reference/cli/server-start) — full flag list for the dev server.
- [Your first OTA update](/tutorials/first-ota-update) — the production happy path Loop 3 mirrors.
- [Roll back a bad bundle](./roll-back-bundle) — what to exercise during Loop 3 testing.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
