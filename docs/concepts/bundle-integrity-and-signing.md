---
sidebar_position: 2
title: Bundle integrity and signing
description: A conceptual explanation of the two-layer integrity model native-update uses for OTA bundles — SHA-256 for transit integrity and RSA-SHA256 signing for source authentication. Covers what each layer protects against, the trust chain, and the threats the model does not address.
keywords: [bundle integrity, ota bundle signing, sha-256 checksum capacitor, rsa-sha256 signature, native-update trust chain]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Bundle integrity and signing

Every OTA bundle that `native-update` accepts has passed two independent integrity checks. This page explains what each check is for, what attacks they defeat, and — equally important — what attacks they cannot defeat. The model is conservative by design: cryptographic checks are cheap; getting them wrong is expensive.

The TL;DR is that the SHA-256 checksum proves nothing was corrupted between server and device, and the RSA-SHA256 signature proves the bundle was produced by an entity holding your private key. The two together rule out a large class of supply-chain attacks but do not rule out everything — read to the end for the limits.

## The two layers in plain language

Imagine a sealed envelope inside a tamper-evident bag.

The envelope is the SHA-256 checksum. Anyone can compute it; anyone can verify it. If the bytes you received hash to the same value the server claimed, the envelope was not opened in transit. But anyone can write a new envelope around new contents — the envelope alone proves nothing about who sent the letter.

The tamper-evident bag is the RSA-SHA256 signature. The bag carries a stamp that can only be made by someone holding the private key. You verify the stamp using the matching public key, which is printed on the bag itself. If the bag's stamp verifies, you know the bag came from the entity holding the private key. Combine that with the unbroken envelope inside and you have two facts: the bytes are unchanged in transit AND they originated from someone you trust.

The metaphor breaks down a little — in practice the signature covers the same bytes the checksum does, so the "envelope inside a bag" is more like one wax seal that does double duty. But the mental model of "transit integrity vs source authentication" is exactly right, and the two checks fail in different ways for different reasons.

## What SHA-256 alone protects against

SHA-256 by itself is enough to detect:

**Bitflips, byte truncation, and other transmission errors.** A corrupted TCP segment, a flaky wireless link, a hard-drive cosmic-ray hit on the way to disk — any single-bit corruption changes the hash to something completely different. The check catches all of these before the SDK tries to apply a half-broken bundle.

**Malicious bundle swaps on uncontrolled CDNs.** If your backend stores bundles on a third-party CDN you don't operate, and an insider at that CDN swaps your bundle for malware, the new bundle's checksum will not match the checksum your backend originally computed. The SDK rejects the swap.

**Server-side bundle confusion.** If your backend has a bug where it serves bundle 1.4.0's bytes when the metadata says 1.4.1, the SDK's local hash computation will mismatch and the install fails with a clear error.

The hash check is a 100ms cost per bundle (streaming) and catches a large class of corruption / integrity bugs that would otherwise produce mystifying crashes hours later. Worth it.

## What SHA-256 does NOT protect against

A determined attacker can swap your bundle for malware AND swap the server's claimed checksum to match. The SDK trusts the server when it says "this bundle should hash to X." If the attacker compromised the server enough to swap the bundle, they can swap the checksum too. SHA-256 alone is integrity but not authenticity.

This is where signing comes in.

## What RSA-SHA256 signing adds

The signature is computed over the bundle bytes using your private key — the secret half of the keypair you generated once and store in your CI's secret manager. The matching public key is compiled into your app at app-store-release time. To produce a signature that verifies against your public key, an attacker needs to possess the private key.

That's a much stronger guarantee than "the server says these bytes are okay." Now the SDK trusts the **signature** — not the server. A compromised CDN, a compromised bundle-storage operator, a compromised backend operator, a compromised network — none of them can produce a bundle the SDK will accept, because none of them have the private key.

The trust chain shrinks from "everywhere the bytes flow" to "wherever the private key lives." Typically that's one location (your CI's secret manager) under one team's control. The blast radius of a compromise anywhere else in the chain drops to zero — they can corrupt or swap the bundle, but the device rejects it.

## The trust chain in detail

Five entities participate in the trust chain. Each one knows something the others might not.

The **device** holds the public key, compiled into the app's binary at the last app-store release. It does not trust the server; it does not trust the network; it only trusts whatever signature was produced by the matching private key.

The **CI** holds the private key, granted via secret-manager access controlled by your team. CI signs every bundle and emits the `.sig` sidecar.

The **backend** holds the bundle bytes and the signature. It does not need to verify the signature on its own — that's the device's job — but the reference Laravel implementation does verify on upload as a sanity check, so a mis-signed bundle never gets to the device in the first place. The backend trusts the CI's signing process (because it has the matching public key registered for the app), but cannot impersonate the CI without stealing the private key.

The **CDN / object store** holds the bundle bytes and serves them via signed URLs. It does not need the private key at all. The Laravel reference uses Laravel's signed-route URLs over the bundle store; cloud-native deployments use S3 / R2 pre-signed URLs. Compromise here can break availability (the attacker can serve a 503) but cannot break integrity (the attacker cannot produce a bundle the device accepts).

The **network** (anyone between device and CDN — ISPs, WiFi operators, captive portals, government intermediaries) sees the bundle bytes in transit. Without TLS pinning, a malicious intermediary can swap the bytes — but the swap fails signature verification on the device. With certificate pinning (see [SDK Reference → Security → Certificate Pinning](/reference/sdk/security/certificate-pinning)), even the swap attempt fails earlier, before the bytes reach the SDK.

The model holds as long as the private key stays inside the CI's secret-manager perimeter. Every operational concern — key rotation, secret-leak response, multi-key transitions — exists to keep that perimeter intact. See [How-to: Rotate signing keys](/how-to/rotate-signing-keys).

## What signing does NOT protect against

This is the section most people skim and then regret skimming. The signature model defeats a large class of attacks but is silent on others. Be honest about the limits.

**Compromise of the private key itself.** If someone exfiltrates your private key, they can sign bundles your devices accept. The signing model offers no defense against this — the model assumes the key is secret. The mitigation is operational: store the key in a hardware security module (HSM), restrict CI access, audit access logs, plan for emergency key rotation. The [Rotate signing keys](/how-to/rotate-signing-keys) how-to walks through the emergency-revoke path.

**Buggy bundles.** A signed bundle that crashes your app on launch verifies just fine — the signature only attests to provenance, not correctness. The rollback mechanism (automatic on missed `notifyAppReady()`, manual via dashboard) is what catches buggy bundles. Signing has nothing to say here.

**Replay of an old signed bundle.** An attacker who saved a copy of an old bundle can serve it later, and the signature still verifies. The SDK has no built-in expiry on signatures. The mitigation is the `version` field: the SDK refuses to "update" to a bundle older than its current one. For belt-and-braces, the signed download URL has its own expiry (default 30 minutes via the Laravel reference), so even a replayed metadata response yields a stale URL that the backend rejects.

**The CDN-but-not-the-bundle-store case.** If your CDN is compromised and serves the wrong bundle bytes, the SDK catches the swap via SHA-256 mismatch. If your CDN AND your backend's claimed checksum are both compromised — the attacker swapped both — the SDK then falls back to signature verification, which catches it because the swapped bytes don't verify under your public key. Layered defenses are intentional.

**A leaked-but-unrevoked old key.** If a private key leaks, devices currently running app-store binaries built BEFORE you rotated still trust that key. There is no way to push a "revoke this public key" message to those devices outside of an app-store binary update. The mitigation is to ship the rotated app-store binary fast — see the emergency-revoke section of [Rotate signing keys](/how-to/rotate-signing-keys).

**Native code injection.** OTA bundles cannot contain compiled native code (iOS sandboxing prevents it; Android doesn't load native libraries from app-data). Signing is irrelevant to this constraint — the constraint sits at the OS level. Don't try to smuggle a `.dylib` or `.so` into a bundle; the install will fail when the OS refuses to load it. For native code changes, ship an app-store binary update.

## Algorithm choices

The plugin uses RSA-SHA256 today. The choice is driven by three factors:

RSA is universally supported. Every cryptographic library on every platform — Node's `crypto`, Java's `java.security`, Swift's `CryptoKit`, OpenSSL — supports it. Adopting a more exotic algorithm (Ed25519, ECDSA-P521) would mean shipping fallbacks for older platforms or rejecting platforms you don't want to reject.

RSA-SHA256 signatures are deterministic. Two signings of the same bundle with the same key produce the same signature. This makes CI builds reproducible and lets you sanity-check the signing step (sign twice; compare bytes). Probabilistic schemes (ECDSA) would require comparing against the public key, not bytes.

The signature size penalty is negligible. An RSA-4096 signature is 512 bytes; an RSA-2048 signature is 256 bytes. Either is dwarfed by the bundle ZIP itself (typically multi-megabyte). Signature size only matters for ultra-bandwidth-constrained use cases that don't apply to mobile OTA.

ECDSA (and Ed25519) are on the roadmap as opt-in algorithms via the `ChecksumAlgorithm` enum — they're already in the type system (`SHA256`, `SHA384`, `SHA512`, `MD5`, `CRC32`), and a future release will route them through to the verification path. Until then, default to RSA-4096 for new projects and RSA-2048 if you're size-constrained.

## What you should walk away with

Three takeaways are worth memorizing:

The SHA-256 hash proves transit integrity. The RSA-SHA256 signature proves source authenticity. Neither alone is sufficient; both together cover the realistic threat model for OTA bundles.

The whole trust model hinges on the private key staying private. Every operational practice — rotation, HSM storage, CI-only access — exists to keep that one secret out of attacker hands.

Signing protects you from the bundle being malicious. It does not protect you from the bundle being broken — buggy code verifies just as cleanly as correct code. Pair signing with rollback, monitoring, and rollouts to catch the bug class.

## Where to go next

- [Security model](./security-model) — the full three-layer security architecture.
- [SDK Reference → Security → Certificate Pinning](/reference/sdk/security/certificate-pinning) — adds transport-layer integrity on top of bundle-layer integrity.
- [Rotate signing keys without breaking active bundles](/how-to/rotate-signing-keys) — the operational side of key management.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
