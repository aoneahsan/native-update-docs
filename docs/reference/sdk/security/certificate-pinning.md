---
sidebar_position: 3
title: Security — Certificate Pinning
description: Reference for the CertificatePinning and CertificatePin types in native-update plus a working OpenSSL recipe to extract SHA-256 pins from your update server's TLS certificate.
keywords: [certificate pinning, native-update TLS, CertificatePin, SHA-256 pin, update server pinning, MITM defence]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Security — Certificate Pinning

**Certificate pinning binds your app to one (or a small set) of TLS certificates so that even a compromised certificate authority cannot serve a rogue cert for your update domain.** Configure it under `SecurityConfig.certificatePinning` in your `PluginInitConfig`. The SDK refuses to connect to your update server if the presented certificate's SHA-256 fingerprint does not match one of the configured pins.

```typescript
import type { CertificatePinning, CertificatePin } from 'native-update';
```

---

## Types

### `CertificatePinning`

```typescript
interface CertificatePinning {
  enabled: boolean;
  pins: CertificatePin[];
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `enabled` | `boolean` | yes | Master switch. `false` disables pinning even if `pins` is non-empty. |
| `pins` | `CertificatePin[]` | yes | One entry per pinned hostname. Multiple pins per hostname are allowed (and recommended). |

### `CertificatePin`

```typescript
interface CertificatePin {
  hostname: string;
  sha256: string[];
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `hostname` | `string` | yes | Exact hostname to pin (no wildcards, no port). Matched against the URL host of every request. |
| `sha256` | `string[]` | yes | One or more **base64-encoded** SHA-256 fingerprints of the server's leaf or intermediate certificate's public key (SPKI). |

**Always pin at least two values per hostname** — the active certificate and a backup. Without a backup, your next certificate renewal breaks your app for everyone on the old binary.

---

## Extract a SHA-256 pin from your server

Use OpenSSL to dump the certificate, extract the public key, hash it, and base64-encode. Run against your live server:

```bash
HOST=updates.yourdomain.com
PORT=443

openssl s_client -servername "$HOST" -connect "$HOST:$PORT" </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

Output is a single line — that is your pin string. Repeat for the backup certificate (typically your CA's intermediate, or a second leaf cert held in cold storage).

For a multi-cert chain, run against each cert in the chain (`openssl s_client -showcerts`) and pick the one(s) you want to pin. Pinning the **leaf** cert is most restrictive but renews most often. Pinning the **intermediate** is more permissive but survives leaf renewal.

---

## Sample configuration

```typescript
const certificatePinning: CertificatePinning = {
  enabled: true,
  pins: [
    {
      hostname: 'updates.yourdomain.com',
      sha256: [
        'MTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWI=', // current leaf
        'YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY=', // backup intermediate
      ],
    },
    {
      hostname: 'cdn.yourdomain.com',
      sha256: [
        'YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY=',
      ],
    },
  ],
};

await NativeUpdate.initialize({
  // ...
  security: {
    enforceHttps: true,
    certificatePinning,
    logSecurityEvents: true,
  },
});
```

When a connection fails the pin check, the SDK throws `INVALID_CERTIFICATE`. With `logSecurityEvents: true`, the failure is logged with the offending hostname (but never the bytes of any cert).

---

## Operational checklist

A pinning rollout that goes wrong locks every user out of updates until they install a new binary. Three habits prevent that:

1. **Pin two certificates from day one.** Active leaf + backup intermediate (or two backup leafs you hold in escrow).
2. **Renew certs before they expire.** The day a pinned cert expires, every device on the old binary stops talking to your server. Calendar this to renew with at least 60 days of headroom.
3. **Ship pin changes in a versioned binary.** When you rotate a pin, ship the new pin in your next App Store / Play Store release **before** you retire the old certificate. Devices on older binaries continue to work because the old cert is still valid.

The CodePush retrospective from 2017 ([archived AppCenter docs](https://learn.microsoft.com/en-us/appcenter/distribution/codepush/)) and the Square engineering blog post on pinning rollback both call out the same pattern: pinning failures are the most common cause of self-inflicted update outages.

---

## When NOT to use pinning

- **You don't control the certificate.** If your update server's cert is renewed by a third-party CDN whose cert rotation you cannot predict, pinning will eventually break. Either pin the CDN provider's documented intermediate (some publish stable intermediates for this purpose) or skip pinning.
- **You're in early development.** Pinning a localhost dev cert is more friction than security. Set `enabled: false` until your production server is up.
- **Your threat model does not include CA compromise.** For most apps, `enforceHttps: true` plus bundle signature verification is enough. Add pinning when you have a specific reason.

## Frequently asked questions

### Can I pin to a Let's Encrypt certificate?

Yes, but expect to update the pin every 90 days when Let's Encrypt renews. Most teams pin to the issuer (Let's Encrypt's `R3` or `R10` intermediate) rather than the leaf for that reason — the intermediate rotates on a multi-year cadence.

### What if a pin check fails — does my app crash?

No. The SDK throws `INVALID_CERTIFICATE` from the call that triggered the network request. Your code catches it and decides — typically you fall back to "we cannot verify the server right now; try again later" UI rather than blocking the user from using the app.

### Can I use HPKP-style report URIs?

The plugin does not implement HPKP report-uri reporting. Use `logSecurityEvents: true` and forward the resulting log entries to your own monitoring instead.

### Does pinning protect bundle integrity?

Pinning protects the *transport* — it makes sure the bytes came from your server unmodified. Bundle integrity (the bytes are what you intended them to be) is enforced separately by the checksum + signature layer. Both are important and they protect different things.

### Will pinning break under a network captive portal?

Yes — captive portals MITM the connection by design, so a pin check fails. The user must accept the captive portal in a browser and reconnect before the next update check. Treat captive-portal-induced `INVALID_CERTIFICATE` errors the same as `NETWORK_ERROR` in your retry logic.

---

<div className="nu-author-card">
Reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
