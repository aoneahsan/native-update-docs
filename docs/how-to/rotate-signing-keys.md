---
sidebar_position: 2
title: Rotate signing keys without breaking active bundles
description: How to introduce a new bundle-signing keypair while keeping bundles signed by the old key verifiable on existing devices. Covers the multi-key transition window, the dashboard's rotation flow, and the emergency revoke path for a leaked private key.
keywords: [native-update key rotation, ota signing key rotation, rotate rsa key capacitor, revoke signing key, native-update emergency revoke]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Rotate signing keys without breaking active bundles

You want to introduce a new signing keypair without invalidating bundles you have already shipped. This is the tricky one — keys rotation done wrong leaves existing app-store installs unable to verify any future OTA bundle.

There are two scenarios. Read the right one:

| Scenario | Path |
|---|---|
| **Scheduled rotation.** Yearly hygiene, algorithm upgrade, team handover. | Multi-key transition (this how-to). |
| **Compromised private key.** Leak, departing-employee panic, audit failure. | Emergency revoke (final section). |

The two paths look similar but differ in trust assumptions. Do not skip ahead.

## How key verification works on the device

Every bundle download flows through:

```
Bundle ZIP bytes → SHA-256 → compare to checksum (rejects on mismatch)
                    ↓
                 RSA-SHA256 verify against the public key compiled into the app
                    ↓
                 Accept or reject
```

The "public key compiled into the app" is whatever you put in `native-update.config.js`'s `publicKey` field at the last app-store release. Devices running an older binary still verify against the public key from that binary — they cannot pick up your new key without an app-store update.

This is the constraint that shapes the entire rotation strategy: **you cannot retire the old public key faster than the slowest device updates from the App Store / Play Store.**

## The multi-key transition (scheduled rotation)

The plugin supports verifying a bundle against a list of acceptable public keys. The bundle has one signature; the SDK tries each public key in order and accepts the first one that verifies. This lets you:

1. Generate a new keypair.
2. Ship a new app-store release whose `publicKey` is **both** the old and new public keys.
3. Wait for adoption (~2-4 weeks for a healthy install base).
4. Cut over your build pipeline to sign with the new private key.
5. Ship one more app-store release whose `publicKey` is the new key only.
6. Securely delete the old private key.

This is a slow process by design.

### Step 1 — Generate the new keypair

```bash
npx native-update keys generate --type rsa --size 4096 --output ./keys/2026-q2
```

Two files in `./keys/2026-q2/`:

- `private-<timestamp>.pem` — store in your secret manager. **Do not** start signing with it yet.
- `public-<timestamp>.pem` — copy the contents.

### Step 2 — Update config to accept both keys

Edit `native-update.config.js`:

```js
export default {
  // ... other fields
  publicKey: [
    `-----BEGIN PUBLIC KEY-----
... NEW public key contents ...
-----END PUBLIC KEY-----`,
    `-----BEGIN PUBLIC KEY-----
... OLD public key contents ...
-----END PUBLIC KEY-----`,
  ],
};
```

When `publicKey` is an array, the SDK iterates through each key and accepts the bundle if any verify succeeds. The order does not matter for security, but listing the new key first is a tiny performance win once you cut over.

If your `native-update` version does not support `publicKey` as an array, upgrade — multi-key verification landed in v2.x. File an issue if you need it backported.

### Step 3 — Ship a normal app-store release

Bundle, sign with the OLD private key (you have not cut over yet), submit to App Store + Play Store, wait for review, ship. The new app-store release contains both public keys; OTA bundles still come in signed by the old key, so existing devices and freshly-updated devices both verify successfully.

### Step 4 — Watch adoption

Track app-store release adoption via your analytics. Wait until at least 95% of monthly active devices are on the new app-store release. For most apps this is ~2-4 weeks. Apps with slow-updating user bases (enterprise iOS deployments, kiosk devices) can take months.

You can keep shipping OTA bundles signed by the old key during this wait — nothing changes for users.

### Step 5 — Cut over your build pipeline

Update your CI / build script's secret reference to point at the new private key. The next bundle you push is signed by the new key. Both old-and-new-binary and new-only-binary devices verify it (old binary uses one of the two keys it knows; new binary uses the new key).

### Step 6 — Schedule the old-key retirement

Pick a date ~2-3 months after Step 5. Until that date, the `publicKey` array stays as `[new, old]`. After that date:

```js
// native-update.config.js — next app-store release after the retirement date
publicKey: `-----BEGIN PUBLIC KEY-----
... NEW public key contents ...
-----END PUBLIC KEY-----`,
```

Ship this. The old public key is no longer trusted. Bundles signed by the old private key now fail verification on devices running this new binary — but you stopped signing with it ~2-3 months ago, so there are no bundles in flight signed by it.

### Step 7 — Securely delete the old private key

Wipe the old private key from your secret manager, CI, and any developer machines. The keypair is fully retired.

The whole rotation takes ~3-5 months end to end. It is intentionally slow because the cost of rushing — bricking the OTA path for slow-updating devices — is high and the upside of rushing is low.

## Emergency revoke (compromised private key)

If the private key leaked, the multi-key dance is wrong. You cannot leave the old key trusted while users still verify against it — anyone with the leaked private key can sign a malicious bundle that real devices accept.

The emergency path looks like:

### Step 1 — Stop accepting bundles signed by the leaked key

Open the dashboard → **Signing Keys** → click the compromised key → **Revoke**. The backend stops serving any bundle signed by it (including ones already uploaded). Devices that hit `/api/v1/updates/check` get `available: false` for the channel — the OTA pipeline is now paused.

This protects your backend from serving a hostile-but-validly-signed bundle if your bundle storage is also compromised. It does NOT change what the SDK on devices trusts — devices still verify against the public key in their installed binary.

### Step 2 — Generate a fresh keypair

```bash
npx native-update keys generate --type rsa --size 4096 --output ./keys/incident-2026-05-11
```

### Step 3 — Ship an emergency app-store release

Update `native-update.config.js` to use **only the new public key** (not an array — single-key, no transition window):

```js
publicKey: `-----BEGIN PUBLIC KEY-----
... NEW public key contents only ...
-----END PUBLIC KEY-----`,
```

Build a new app-store release. Submit with the standard expedited-review flag noting "security update." Apple typically expedites within 24-48 hours; Google Play within 24 hours. The new binary trusts only the new key.

### Step 4 — Accept the gap

Between Step 1 (backend stops serving) and Step 3 ramping up on devices (app-store adoption), there is a window where:

- Devices on the old app-store binary trust the old public key. The backend refuses to serve bundles signed by the old private key. Effectively: OTA pipeline paused.
- Devices on the new app-store binary trust the new public key. The backend serves bundles signed by the new private key.

You cannot avoid this gap. Pause OTA releases entirely until adoption of the new binary is healthy, then resume.

### Step 5 — Post-incident hygiene

Audit how the private key leaked. Rotate any other credentials in the same blast radius (CI secret manager access tokens, developer SSH keys with access to the build machine, etc.). Document the timeline in your incident log.

## How not to rotate keys

Three approaches that look fine in a planning doc and break in practice:

**"Just deploy the new key in the next release."** Single-key rotation breaks every device that hasn't yet updated from the App Store / Play Store. They trust the old public key, you start shipping bundles signed by the new private key, none verify, OTA stops working on a long tail of devices until each user updates the binary. The user-visible symptom is "the app stopped getting updates" — silently, with no error.

**"Sign the same bundle with both keys."** Tempting but unsupported — the plugin's signature scheme is one signature per bundle. You'd need to ship two parallel bundles or extend the bundle format. Don't.

**"Skip rotation; we already have a long key."** Long keys delay cryptanalysis but don't remove the operational risk of secret leakage. Annual rotation is hygiene, not a cryptographic requirement.

## Verification

After Step 5 of either path, sanity-check with a test device:

```bash
adb logcat | grep native-update
# Look for: [native-update] signature verified
```

If you see `SIGNATURE_VERIFICATION_FAILED`, the device's installed binary does not trust any key that the bundle is signed by. For a scheduled rotation this means the user has not yet updated the binary; for an emergency revoke this means Step 3 hasn't reached this device yet.

## Related

- [SDK Reference → Security → Overview](/reference/sdk/security/overview) — the three-layer security model.
- [CLI Reference → keys generate](/reference/cli/keys-generate) — keypair generation options.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
