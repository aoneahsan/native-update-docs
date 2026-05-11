---
sidebar_position: 5
title: Security model
description: The threat model native-update is designed to defend against, the three layers of defense it implements (transport, content, runtime), what's in scope and what isn't, and the operational practices the model assumes you follow.
keywords: [native-update security model, ota threat model, capacitor secure updates, native-update certificate pinning, ota three-layer security]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Security model

OTA updates are an unusually high-value target. The path delivers code that runs with your app's permissions on user devices — compromise it and the attacker compromises every device that accepts a single bad bundle. `native-update` treats this seriously: every default is conservative, every check is layered, and every shortcut you might want to take is documented as a thing that should not exist in production.

This page is the threat model in prose. It covers what the system defends against, what it doesn't, and the operational practices the model assumes you follow. Read it in full before you ship.

## The threat model

Three classes of attacker matter for an OTA system. The system's defenses are calibrated to each.

**Class 1: passive network observer.** Someone watching the wire — an ISP, a captive portal operator, a coffee-shop WiFi sniffer. They can see the bytes you transmit but can't modify them in real time. Defense: HTTPS for every endpoint, no exceptions in production. The system handles this layer at the OS level (URLSession on iOS, OkHttp on Android, browser fetch on web); the SDK does no additional work here, and that's appropriate.

**Class 2: active network attacker.** Someone who can intercept and modify traffic — a hostile WiFi operator, a state-level adversary with a valid TLS cert from a complicit CA, a malware that's compromised the device's certificate store. They can swap your bundle bytes for malware bytes in transit. Defense: bundle signing means even a successful MITM produces bytes that don't verify under your public key, so the SDK rejects them. Optional certificate pinning provides a second layer — the SDK refuses to talk to any server whose cert hash doesn't match a pinned value.

**Class 3: compromised infrastructure.** Someone who's broken in further — a leaked CI secret, a malicious insider at your CDN, a compromised database. They can directly modify the bytes the backend serves. Defense: bundle signing again. The signing private key lives outside the bundle-storage tier; an attacker who can corrupt storage cannot mint a fresh signature. The trust anchor is the public key compiled into the app at app-store-release time.

The Class 1 defense is automatic; the Class 2 and Class 3 defenses depend on signing being enabled and certificate pinning being configured. Defaults push you toward both being on.

## The three layers

Defense in depth. Each layer catches a different attack class; even if one fails, the others hold.

### Layer 1 — Transport security

HTTPS is mandatory in production. The SDK refuses to download bundles from `http://` URLs in production builds, and the backend's signed-URL minting refuses to issue `http://` URLs unless explicit dev-mode flags are set. On iOS, Apple's App Transport Security adds a hard floor — even if your config tries to override it, iOS overrides your override. On Android, the network security config defaults to "no cleartext" since API 28 (Android 9, 2018).

Certificate pinning sits on top of HTTPS. The SDK can be configured to require that the server's TLS cert match a pre-shared SHA-256 hash. This defeats CA-level compromise: even an attacker with a valid cert from a complicit CA fails the pin check. See [SDK Reference → Security → Certificate Pinning](/reference/sdk/security/certificate-pinning) for the configuration mechanics.

Pinning is opt-in because the operational cost is real — you must update your app every time you rotate your TLS cert, and getting it wrong bricks every install until the next app-store release. The recommendation is: pin your CA, not your leaf cert. CA rotations are rare; leaf rotations happen every 90 days for Let's Encrypt.

### Layer 2 — Content integrity

Two checks per bundle. SHA-256 over the bundle bytes proves transit integrity (nothing got corrupted on the wire). RSA-SHA256 signature over the same bytes proves source authenticity (the bundle came from someone holding the private key). Both happen on the device, before the bundle is staged for apply.

See [Bundle integrity and signing](./bundle-integrity-and-signing) for the full breakdown of what each check protects against and what they don't.

### Layer 3 — Runtime safety

Even a perfectly delivered bundle can crash your app. The runtime layer is the SDK's defenses against bad code (not against attackers): the `notifyAppReady()` heartbeat, the automatic crash rollback, the bundle history that lets the SDK revert to a known-good version.

The runtime layer makes a strict assumption: every bundle must call `notifyAppReady()` within the configured window (default 60s from launch). Bundles that don't are presumed crashed and rolled back. This means **a bundle that breaks `notifyAppReady()` itself triggers a rollback** — the developer mistake of "I refactored the SDK init out of the boot path" auto-corrects to the previous bundle. Defense in depth includes defense against developer bugs, not just attackers.

## What's in scope

The system defends against:

Malicious bundle delivery over compromised networks (Layer 1 + 2).

Malicious bundle delivery from compromised CDNs / storage (Layer 2).

Malicious bundle delivery from compromised backends, as long as the private signing key is not also compromised (Layer 2).

Buggy bundles that crash your app on launch (Layer 3).

Replay of old bundles by an active attacker (the SDK refuses to install a bundle with a lower version than the currently-installed one).

Stale signed download URLs after their TTL expires (the backend enforces the TTL; the SDK does not retry expired URLs).

Cross-app bundle leaks — every signed URL is bound to the app's ID, and the bundle's metadata is scoped per-app on the backend.

Mass-API-key abuse — keys are rate-limited per-key (default 600 req / 15 min) plus route-level throttle as defense-in-depth.

## What's out of scope

Honesty about limits matters here. The system does NOT defend against:

**Compromise of the private signing key.** If your CI's secret manager leaks the private key, an attacker can sign bundles your devices accept. The mitigation is operational (HSMs, restricted CI access, audit logs, emergency rotation) — see [How-to: Rotate signing keys](/how-to/rotate-signing-keys).

**Compromise of your dashboard / Nova admin login.** A leaked admin session can upload arbitrary bundles, mark them active, push them to 100% rollout. The mitigations are SaaS-side: 2FA on dashboard logins, audit logs of admin actions, suspension flows for compromised accounts. Self-hosters are responsible for their own admin auth hygiene.

**Bundles that contain malicious-but-legitimately-signed code.** A disgruntled developer with CI access could push code that exfiltrates data; the signing model just confirms it came from your CI. The mitigation is code review of every release, branch protection on `main`, required reviewers on PRs touching anything that ships into a bundle.

**Sophisticated supply-chain attacks on dependencies.** A malicious npm package included in your `package.json` ends up in the bundle, signs cleanly, ships. The mitigation is `npm audit` / `yarn audit`, lockfile review, and tools like Socket / Snyk. Out of scope for this system.

**Compromise of the user's device itself.** A jailbroken iOS device or a rooted Android device can do anything the OS would normally prevent — modify the public key in the app binary, swap a verified bundle on disk, capture decryption keys. The SDK's keychain / keystore usage assumes a non-jailbroken device. For apps where this matters (financial, health), pair `native-update` with a jailbreak / root detection library and refuse to run when detected.

**Side-channel attacks on the verification process.** Timing attacks against the signature-verification logic, fault-injection against the keychain. The SDK uses the standard crypto primitives from Node's `crypto`, Apple's `Security`, and Java's `java.security` — those libraries already mitigate well-known side channels. Custom verification code (which the SDK does not do) would be a different story.

**Denial of service.** The system has rate limits but not anti-DDoS. A determined attacker can flood your update-check endpoint with junk traffic; that's a job for Cloudflare / AWS Shield / your CDN, not for `native-update`.

## The operational assumptions

The model only holds if you follow a few operational practices:

The private signing key lives in CI's secret manager and nowhere else. Not in the repo, not on developer machines, not in chat history. Treat a leak as a security incident — rotate immediately via the emergency-revoke path.

The public key in `native-update.config.js` matches the private key in CI. Drift between them is the most common cause of "all my bundles started failing verification" — defense is the `bundle verify` step in CI (see [Integrate with CI/CD](/how-to/ci-cd-github-actions)).

`notifyAppReady()` is called in your app's boot path, on every launch, before any code path that could crash. Skip it and the SDK's automatic rollback kicks in after every install — users see no updates ever land.

API keys are scoped per-environment. Development keys for dev builds, production keys for production builds. A development key that ships in a production AppStore release is a leaked production credential.

Bundles are reviewed before release. The same PR-review discipline that gates your store releases gates your OTA releases. The signing key signs whatever you tell it to.

Updates to the app's `publicKey` config are reviewed extra carefully. Misconfiguring the public key in a fresh app-store release breaks OTA for every device that updates to it.

If any of these assumptions break, the model breaks accordingly. The system is not magic — it is a careful set of defaults that, followed correctly, defend against the realistic threats. Followed sloppily, it becomes much less useful.

## A note on regulated industries

Apps in financial, health, or government verticals usually have explicit compliance requirements that go beyond this model:

**FIPS 140-2 / 140-3 cryptographic-module compliance.** The plugin uses platform-default crypto (OpenSSL on Android, CommonCrypto / SwiftCrypto on iOS). If you need FIPS validation, you need to verify your specific OS version's crypto module is in scope — that's an OS-level question, not a plugin question.

**SOC 2 / HIPAA audit trails.** The Laravel reference backend logs every signing-key access, every build upload, every admin action. Self-hosted deployments inherit this; SaaS deployments depend on the SaaS provider's controls. Audit your provider's SOC 2 report, not the plugin's behaviour.

**Air-gapped deployments.** Some regulated environments forbid devices from reaching the public internet. The self-hosted Laravel reference works fine on a private network; the device-side SDK doesn't care whether `serverUrl` is `https://updates.example.com` or `https://internal.example.lan`.

## Where to go next

- [Bundle integrity and signing](./bundle-integrity-and-signing) — deep dive on the two-layer integrity model.
- [Architecture](./architecture) — the diagrams showing the trust boundaries this model enforces.
- [SDK Reference → Security → Overview](/reference/sdk/security/overview) — the runtime API for inspecting the security state on-device.
- [How-to: Rotate signing keys](/how-to/rotate-signing-keys) — the operational practice the model assumes you follow.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
