---
sidebar_position: 8
title: Restrict an API key to your app (ship the key safely)
description: Lock a native-update API key to specific web origins, Android apps (package + signing certificate), and iOS bundle ids so it can be shipped inside your app without a self-hosted proxy. Covers the dashboard flow, getting signing-cert fingerprints with keytool, the plugin version requirement, and what the restrictions do and do not protect.
keywords: [native-update api key restrictions, restrict api key origin, android signing cert sha256 api key, ios bundle id api key, ship api key in app, capacitor ota api key security]
last_update:
  date: 2026-07-14
  author: Ahsan Mahmood
---

# How-to: Restrict an API key to your app

Your `nu_app_…` API key is meant to ship **inside** your app — a Capacitor
binary or a web build. You do **not** need to stand up your own backend just to
hide it. Instead, lock each key to the clients allowed to use it, in the
dashboard under **Apps → API Keys → Restrictions**.

A key with **no** restrictions works from anywhere (this is the default, and it
stays that way for existing keys). Once you add any restriction, only the listed
clients can use the key — everything else gets `403 API_KEY_RESTRICTED`.

## Web: allowed origins

Add the exact origins your web app runs on:

- `https://app.example.com` — one exact origin.
- `https://*.example.com` — any sub-domain of `example.com` (not the apex; add
  `https://example.com` separately if you need it).
- `http://localhost:5173` — for local development.
- `http://192.168.1.10:5173` — your dev server as a phone on the LAN sees it.

This is enforced against the browser's `Origin` header, which page JavaScript
cannot forge — so a web-origin restriction genuinely stops another site from
reusing your key. Because of this, the `/v1/*` update API is deliberately
callable straight from the browser (it sends permissive CORS); the real gate is
this per-key check, not CORS.

### Scheme and port are part of the origin

An origin is matched exactly, so `https://localhost`, `http://localhost:3843`
and `https://localhost:3843` are **three different origins**. Add each one you
actually use. (`https://localhost` is what a Capacitor **Android** WebView sends
as its `Origin` — though a Capacitor app that uses the plugin is normally matched
by the Android list below, not by this one. Capacitor **iOS** sends
`capacitor://localhost`, which is not an http(s) origin and cannot be
allowlisted here — use the iOS list.)

### https is required, except locally

Public hosts are **https-only**. You do not need to type the scheme — enter
`app.example.com` and it is stored as `https://app.example.com`. Entering
`http://app.example.com` is rejected, so a key can never be pinned to an
insecure public page.

Plain `http` is accepted only where there is no public network to protect:

- `localhost` and any `*.localhost` sub-domain;
- loopback, private and link-local IPs — `127.0.0.1`, `10.x.x.x`,
  `172.16–31.x.x`, `192.168.x.x`, `169.254.x.x`, `[::1]`, `fc00::/7`,
  `fe80::/10`.

A **public** IP (`203.0.113.5`, `[2606:4700::1111]`) is treated like any other
public host: https only.

## Android: allowed apps

Add your app's **package name** plus its **signing-certificate fingerprints**.
Get them with `keytool`:

```bash
# From your keystore:
keytool -list -v -keystore my-release.keystore -alias my-alias
# …or print a specific certificate file:
keytool -list -printcert -file cert.pem
```

Copy the **SHA-256** (and optionally SHA-1) lines. Colons and spaces are fine —
they are stripped automatically.

:::tip Add BOTH certificates
If your app is distributed through Google Play, add **two** certificates: your
**upload key** AND the **Play App Signing** certificate (Play Console → your app
→ Test and release → App integrity). Google re-signs your app with the Play
Signing key, so that is the certificate real installs present.
:::

A package-only entry (no fingerprints) is accepted but weaker — the dashboard
flags it — because any app declaring that package name would match.

## iOS: allowed apps

Add your app's **bundle identifier** (e.g. `com.example.app`). Leave the team id
empty — the plugin does not currently send `X-Ios-Team-Id`.

## Plugin version requirement

Android and iOS restrictions rely on identity headers the app sends, which only
exist in **native-update ≥ 3.2.0**. An app built with an older version sends no
identity and will be **blocked** by an Android/iOS restriction until you rebuild
it on ≥ 3.2.0. Web origin restrictions work with any version.

The plugin attaches the headers automatically on its own update checks. If you
run your **own** update-check fetch, read the identity first:

```typescript
import { NativeUpdate } from 'native-update';

const id = await NativeUpdate.getAppIdentity();
// id = { platform, packageName?, certSha256?, certSha1?, bundleId? }
const headers: Record<string, string> = { 'X-API-Key': apiKey };
if (id.platform === 'android') {
  if (id.packageName) headers['X-Android-Package'] = id.packageName;
  if (id.certSha256) headers['X-Android-Cert-Sha256'] = id.certSha256;
  if (id.certSha1) headers['X-Android-Cert-Sha1'] = id.certSha1;
} else if (id.platform === 'ios') {
  if (id.bundleId) headers['X-Ios-Bundle-Id'] = id.bundleId;
}
```

## What restrictions do and do not protect

- **Web origin checks are strong** — browser-enforced and not forgeable by page
  JS.
- **Android/iOS identity headers are client-attested, not cryptographic
  attestation** — the same trust model as Google Maps API-key app restrictions.
  They stop casual key reuse and quota abuse, but a determined attacker can
  replay the headers with `curl`. For hard device attestation, layer Play
  Integrity / App Attest yourself.
- Restricting a key never leaks its allowlist: a blocked request only sees a
  generic `API_KEY_RESTRICTED` reason plus its own observed origin/package.

## Verify

After saving, the dashboard's API Keys table shows a summary
(`2 origins · 1 Android · 1 iOS`) instead of the amber **Unrestricted** badge,
and a **Blocked requests** counter appears once anything is rejected. Ship a
build (≥ 3.2.0) and confirm update checks still succeed from your real app while
a `curl` from an unlisted origin/app gets `403`.
