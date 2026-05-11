---
sidebar_position: 1
title: Security — Overview
description: Security primitives in native-update — getSecurityInfo, SecurityConfig, certificate pinning, and the full UpdateErrorCode catalogue. Covers HTTPS enforcement, bundle signing, and input validation.
keywords: [native-update security, getSecurityInfo, SecurityConfig, certificate pinning, capacitor security, OTA security]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Security — Overview

**The Security API of `native-update` exposes the active security posture of the plugin (`getSecurityInfo()`), lets you tighten transport security with certificate pinning (`CertificatePinning`), and surfaces a typed catalogue of error codes (`UpdateErrorCode`) so you can branch on specific failure modes.** Bundle signing and checksum verification are also part of the security story but are configured under [`LiveUpdateConfig`](../live-update/config) — not the security block — because they are bundle-lifecycle concerns.

This page is the mental model. Follow the linked pages for the full reference:

- [Error codes](./error-codes) — the complete `UpdateErrorCode` catalogue with what each code means and how to react
- [Certificate pinning](./certificate-pinning) — `CertificatePinning` and `CertificatePin` types with a working pin-extraction recipe

## Security model in three layers

The plugin's security posture is layered. Each layer can be configured independently; they compose.

| Layer | What it protects | How to configure |
|---|---|---|
| **Transport** (HTTPS, certificate pinning) | Network-level attacks — MITM, DNS hijack, malicious Wi-Fi | [`SecurityConfig.enforceHttps`](#enforcehttps), [`SecurityConfig.certificatePinning`](#certificatepinning) |
| **Bundle integrity** (checksums) | Bit-flips, partial downloads, tampered files at rest | [`LiveUpdateConfig.checksumAlgorithm`](../live-update/config#checksumalgorithm) |
| **Bundle authenticity** (signatures) | A signed bundle from a server you don't control | [`LiveUpdateConfig.requireSignature`](../live-update/config#requiresignature) + `publicKey` |

Bundle integrity tells you "the bytes you downloaded are exactly what the server intended". Bundle authenticity tells you "the server that signed those bytes is the one you trust". Skip either layer at your own risk.

## What `getSecurityInfo()` returns

```typescript
getSecurityInfo(): Promise<SecurityInfo>
```

Cheap inspection call. Returns the currently active security configuration so you can render a "security posture" diagnostics screen, log it to your monitoring, or assert in tests.

```typescript
interface SecurityInfo {
  enforceHttps: boolean;
  certificatePinning: CertificatePinning;
  validateInputs: boolean;
  secureStorage: boolean;
}
```

| Field | Type | Description |
|---|---|---|
| `enforceHttps` | `boolean` | `true` if HTTP URLs are rejected. |
| `certificatePinning` | [`CertificatePinning`](./certificate-pinning) | Pin configuration. `enabled: false` if disabled. |
| `validateInputs` | `boolean` | `true` if the SDK validates every input from the JavaScript layer (always `true` from v2 onward; the option is kept for API stability). |
| `secureStorage` | `boolean` | `true` if sensitive config persists via OS-backed encrypted storage (Keychain on iOS, EncryptedSharedPreferences on Android). Always `true` from v2 — the field is read-only. |

```typescript
const security = await NativeUpdate.getSecurityInfo();

if (!security.enforceHttps) {
  console.warn('[security] HTTPS not enforced — production should set enforceHttps: true');
}
if (!security.certificatePinning.enabled) {
  console.info('[security] Certificate pinning not configured');
}
```

---

## `SecurityConfig`

Pass under the top-level `security` key in `PluginInitConfig`.

```typescript
interface SecurityConfig {
  enforceHttps?: boolean;
  certificatePinning?: CertificatePinning;
  validateInputs?: boolean;
  secureStorage?: boolean;     // deprecated — always true from v2
  logSecurityEvents?: boolean;
}
```

### `enforceHttps`

| | |
|---|---|
| Type | `boolean` |
| Default | `true` |

When `true`, every URL passed to `download()` / `setUpdateUrl()` / `getLatest()` etc. is checked against `^https://`. HTTP URLs throw `INSECURE_URL`. Set to `false` only when running against a localhost dev server during development.

```typescript
security: {
  enforceHttps: import.meta.env.PROD,   // true in production, false in dev
}
```

### `certificatePinning`

| | |
|---|---|
| Type | [`CertificatePinning`](./certificate-pinning) |
| Default | `{ enabled: false, pins: [] }` |

When `enabled: true`, the SDK refuses to connect to your update server unless the server's TLS certificate matches one of the SHA-256 fingerprints in `pins`. Mitigates compromised certificate authorities and rogue middleboxes. Setup is non-trivial — see the dedicated [Certificate pinning](./certificate-pinning) page.

### `validateInputs`

| | |
|---|---|
| Type | `boolean` |
| Default | `true` |

Always `true` from v2 onward. Setting to `false` is ignored. The SDK always validates inputs at the JS↔native bridge: URL shape, byte-size limits, path traversal in archive entries (`../../../etc/passwd` style), JSON-only payloads.

### `secureStorage` *(deprecated)*

| | |
|---|---|
| Type | `boolean` |
| Default | `true` (always) |

Deprecated since v2. Secure storage is always on:

- **Android** — `EncryptedSharedPreferences` (Android Keystore-backed).
- **iOS** — Keychain (Apple Secure Enclave when available).
- **Web** — sensitive fields are not persisted to localStorage; runtime-only.

Setting this to `false` is ignored.

### `logSecurityEvents`

| | |
|---|---|
| Type | `boolean` |
| Default | `false` |

When `true`, the SDK emits structured logs for every security-relevant event (rejected URLs, signature failures, certificate-pin failures, input-validation rejections). Wire to your existing logger via the `enableLogging` flag in `PluginInitConfig`. Off by default to keep logs quiet in production.

---

## Recommended production posture

```typescript
const security: SecurityConfig = {
  enforceHttps: true,
  certificatePinning: {
    enabled: true,
    pins: [
      { hostname: 'updates.yourdomain.com', sha256: ['Base64SHA256OfYourCert', 'BackupPin'] },
    ],
  },
  validateInputs: true,         // always; explicitly stated for clarity
  logSecurityEvents: true,      // capture in your monitoring
};
```

And under `LiveUpdateConfig`:

```typescript
liveUpdate: {
  // ...
  requireSignature: true,                   // refuse unsigned bundles
  checksumAlgorithm: ChecksumAlgorithm.SHA256,
  publicKey: import.meta.env.VITE_NATIVE_UPDATE_PUBLIC_KEY,
  allowedHosts: ['updates.yourdomain.com'], // belt + braces
}
```

## Threat model coverage at a glance

| Threat | Mitigation |
|---|---|
| MITM on update download | `enforceHttps` + certificate pinning |
| Compromised CA issues a rogue cert for your update domain | Certificate pinning |
| Server compromise pushes a malicious bundle to one channel | Bundle signature verification (`requireSignature: true`) |
| Bit-flip / partial download | Checksum verification (always on) |
| Path traversal in bundle ZIP entry | Always-on archive sanitisation; throws `PATH_TRAVERSAL` |
| Bundle exceeds disk budget | `maxBundleSize` cap; throws `SIZE_LIMIT_EXCEEDED` |
| Plain HTTP URL slipped into config | `enforceHttps` rejects with `INSECURE_URL` |
| Signing key compromised | Key rotation — issue new key, re-sign bundles, ship updated `publicKey` in next binary |
| Replay of old (vulnerable) bundle | Server-side: refuse to serve a downgrade. Client-side: `LiveUpdateConfig.allowDowngrade` (default `false`) |

## Frequently asked questions

### Can I disable signature verification temporarily for a hotfix?

You should not. The defence-in-depth value of signature verification comes from being unconditional. If your CI signing pipeline is broken, fix it — do not bypass verification on devices.

### How do I rotate the signing key without breaking older app versions?

The plugin supports multiple public keys via your backend's signing-key resource (Nova `SigningKey` model). The flow: ship a new app version with both old and new public keys configured; deprecate the old key on the server after enough users have upgraded; eventually remove the old key from the next binary. The how-to ships in **Batch 8** alongside the channel-management guide.

### Does certificate pinning break my app when the cert is renewed?

Yes — that is the whole point. Always pin **at least two** certificates: the active one and a backup intermediate. Renew the active cert before it expires, and ship the new pin in your next binary. Document this rotation in your release runbook.

### What happens if a user's clock is wildly wrong?

Signature and checksum verification do not depend on time. TLS certificate validation does — if the user's clock is years off, HTTPS will refuse to connect. The SDK does nothing to mask this; the user must fix their clock.

### Are bundles encrypted at rest on the device?

Bundle archives are stored under your app's sandboxed data directory (Android internal storage, iOS app container) which is encrypted at rest by default on modern OS versions (iOS 8+, Android 7+ with Direct Boot). The SDK does not add an extra encryption layer because it would not meaningfully improve the security model — anyone who can read your sandboxed data has already compromised the OS sandbox.

### Where does telemetry from `logSecurityEvents` go?

To the configured logger (`enableLogging`). The SDK does not phone home — no third-party telemetry. You wire the logger to wherever your own monitoring (Sentry, your backend, etc.) lives.

---

<div className="nu-author-card">
Reference pages by <a href="https://aoneahsan.com">Ahsan Mahmood</a>. Source of truth: <code>src/definitions.ts</code> in the plugin repo. Spot a discrepancy? <a href="https://github.com/aoneahsan/native-update-docs/issues">Open an issue</a>.
</div>
