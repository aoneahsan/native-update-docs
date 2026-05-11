---
sidebar_position: 1
title: How OTA updates work
description: A conceptual walkthrough of the over-the-air update lifecycle in native-update, from the moment you push a release to the moment the user sees the new bundle. Covers bundle creation, delivery, sync, verification, atomic apply, and rollback.
keywords: [how ota updates work, capacitor ota internals, native-update lifecycle, bundle apply atomic swap, over-the-air update explained]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How OTA updates work

An over-the-air update is the trick of replacing the web assets that ship inside a Capacitor app — HTML, CSS, JavaScript, fonts, images — without going through the App Store or Play Store. The native shell stays put; only the JavaScript layer changes. This page explains how `native-update` does that, end to end, so you can reason about edge cases and failure modes without grepping the SDK source.

The high-level loop is short to describe and long to implement well: package, sign, upload, deliver, download, verify, stage, atomically swap on next launch, observe for crashes, rollback if needed. Each of those words covers a real engineering decision.

## The five moving parts

OTA updates involve five components, not the one or two you might expect:

The first is the **CLI**, which runs on your build machine and on CI. Its job is to take a built web directory (`./dist`, `./www`, whatever) and produce two artifacts: a deterministic ZIP and a sidecar signature file. Nothing in the runtime SDK knows about the ZIP-creation step — that's compile-time work.

The second is your **backend** — the hosted SaaS, the self-hosted Laravel reference, or any custom server that speaks the contract. It receives the signed bundle, stores the bytes, and exposes two endpoints: a metadata endpoint that says "here is the newest active bundle for this channel" and a download endpoint that streams the bundle bytes through a short-lived signed URL.

The third is the **device-side SDK**, running inside your app's WebView. It calls the backend, downloads bundles, verifies them, stages them on disk, swaps the active bundle on next launch, and reports the outcome back to the backend.

The fourth is the **host operating system**'s file system and lifecycle. iOS and Android decide when the app is suspended, when background tasks fire, and when the WebView gets the new bundle. The SDK can request behavior; the OS decides what actually happens.

The fifth is the **user**, who closes and reopens the app at unpredictable intervals and whose network connection is sometimes excellent and sometimes a hotel Wi-Fi with a captive portal. Every design choice in `native-update` accommodates this last party.

## The lifecycle, step by step

A single OTA release moves through eleven steps. Each is small individually, and each fails in characteristic ways you should know about.

**Step 1 — Package.** Your CI runs `yarn build` to produce a static web directory, then `npx native-update bundle create ./dist`. The CLI walks the directory, refuses to bundle obvious mistakes (a directory containing `node_modules` / `.git` / `.env*` is almost certainly a project root, not a build output), and produces a deterministic ZIP plus a JSON metadata file with version, channel, SHA-256 checksum, size, timestamp, and any free-form metadata you passed via `--metadata`.

**Step 2 — Sign.** `npx native-update bundle sign --key ./keys/private.pem` reads the ZIP bytes, computes an RSA-SHA256 signature over them, and writes a `.sig` sidecar containing the base64 signature plus an `algorithm` field. The private key never leaves CI; the matching public key was compiled into your app's binary at app-store-release time.

**Step 3 — Upload.** The CI uploads the signed ZIP, the `.sig` sidecar, and the metadata JSON to the backend. The backend verifies the signature against the public key you registered for this app, stores the bundle bytes in whatever object store it uses (FilesHub, Google Drive, S3, R2, local disk), and writes a row into its `builds` table with `version`, `channel`, `bundle_id` (a UUID), `checksum`, `signature`, `rollout_percentage`, `is_active`. The row becomes the source of truth for what bundle is "current" for that channel.

**Step 4 — Sync request.** A device launches your app. Your boot code calls `NativeUpdate.sync()`. The SDK sends a `GET /api/v1/updates/check` with headers identifying the API key, the device hash, the currently-installed bundle version, the platform, and the native app version. The query string carries the channel.

**Step 5 — Server decision.** The backend looks up the newest active build for the requested channel, checks platform compatibility, checks the rollout percentage (does this device hash fall in the cohort that should receive this bundle?), checks the minimum-native-version gate (is the device's app-store binary recent enough?), and replies. If there is nothing newer than the device's current version, it replies `{available: false}`. If there is, it replies with the version, bundle ID, checksum, signature, size, and a short-lived signed download URL — typically valid for 30 minutes.

**Step 6 — Download.** The SDK hits the signed URL, streams the bundle ZIP to local app storage, and emits progress events. The URL is bound to the bundle's checksum and app ID; tampering with the URL produces a 403. Downloads survive backgrounding on Android (foreground service) but pause on iOS when the app suspends — the next foreground resumes from the partial file rather than restarting.

**Step 7 — Integrity check.** After the download completes, the SDK computes SHA-256 over the local ZIP and compares to the server-supplied checksum. A mismatch — corruption in transit, an MITM swap, a server-side bytecode-flip somewhere — is rejected here and the partial bundle is deleted.

**Step 8 — Signature verify.** The SDK loads the public key compiled into the app (or fetched dynamically if you use that mode), runs RSA-SHA256 verification against the bundle bytes and the server-supplied signature. A failure here means either the bundle was tampered with after signing or the keypair is wrong. The bundle is deleted; the failure is reported back to the backend as `download_failed` for the dashboard's rollback alerts.

**Step 9 — Stage.** The SDK unpacks the ZIP into a fresh directory under the app's data area (`<sandbox>/native-update/bundles/<version>/`) and writes a `pending` marker. The active bundle on disk has not changed — the user is still running the old code. The pending bundle is invisible to them.

**Step 10 — Atomic swap on next launch.** When the user next launches the app, the SDK checks for a pending bundle, swaps the WebView's bundle path to point at the new directory, removes the pending marker, and lets the app boot. The swap is atomic: either the app is reading from the new directory or it's reading from the old one, never half-and-half.

**Step 11 — Verify-or-roll-back.** Inside your app code, you call `NativeUpdate.notifyAppReady()`. This is the SDK's "the new bundle works" signal. If the call lands within the configured window (default 60 seconds from launch), the SDK flips the new bundle from `pending` to `verified` and that becomes the new active bundle for all future launches. If the call doesn't land — the bundle crashed before reaching it — the SDK rolls back on the next launch by swapping back to the previous verified bundle and marking the new one `failed` so it isn't retried.

That is the entire happy path plus the one crash-recovery branch. Everything else in the SDK exists to handle weirder cases: percentage rollouts that pick some devices but not others, channel switching that retargets a device mid-flight, background-task scheduling that races user behaviour, foreground-service notifications on Android, BGTaskScheduler on iOS, signed-URL TTL extensions for slow networks, retry-with-backoff when the backend is briefly unreachable.

## Why this design and not a simpler one

A reader new to OTA could reasonably ask: "Why eleven steps? Just download a new `bundle.js` and `eval()` it." Three constraints make the simple version unworkable.

The first is **integrity**. Without checksum-and-signature verification, a compromised CDN, a mid-stream MITM, or a hostile bundle-storage operator could swap your bundle for malware. The OTA path is, by definition, code that runs with your app's permissions on the user's device. The signing model means a leaked CDN cannot compromise users; only a leaked private signing key can. That is a much smaller attack surface to guard.

The second is **atomicity**. If you replaced files one at a time, a poorly-timed app launch could load three files from the new bundle and two from the old, producing version-skew errors. The unpack-then-swap pattern guarantees that any single launch sees a fully consistent bundle. The cost is double-storage of the bundle during the swap window — a few extra megabytes for a few seconds.

The third is **reversibility**. If the new bundle crashes, the device must self-heal — there is no synchronous "did the bundle work?" feedback channel from the user's device to your backend. The `notifyAppReady` mechanism is the SDK's local heartbeat. If the bundle crashes before the heartbeat fires, the SDK assumes the worst and rolls back. The 60-second default window is calibrated to be generous for any reasonable boot path but tight enough that broken bundles don't persist across many launches.

The eleven-step model is the simplest design that satisfies all three constraints. Skip any one of them and you ship a system that "works" in development and breaks subtly in production.

## What the model gives you that "deploy a new web build" does not

Web deployments — pushing new HTML/JS to a CDN — already let browsers fetch the new code on next load. So why bother with OTA?

Three reasons, in order of importance.

Capacitor apps run their code from the device's filesystem, not from a remote URL. The web bundle is baked into the app shell at app-store-release time. Without OTA, every web change requires an App Store / Play Store review cycle — typically 1–7 days, sometimes longer. OTA cuts that to minutes.

Even if your app could load JS from a remote URL, doing so directly violates Apple's App Store Review Guideline 2.5.2 unless the code is run by `WKWebView`. The OTA mechanism stays inside the carve-out because the WebView is what loads the bundle.

OTA gives you offline support for the update itself — bundles are staged ahead of time, so the user doesn't pay a network round-trip on the launch that applies them. A CDN-loaded approach can't do this without service workers and IndexedDB, at which point you've reinvented half of the OTA stack anyway.

## Where to go next

This page is the conceptual model. For the details:

- [Bundle integrity and signing](./bundle-integrity-and-signing) — what the SHA-256 + RSA-SHA256 layers protect against.
- [Update strategies compared](./update-strategies-compared) — immediate vs background vs manual.
- [Architecture](./architecture) — system diagrams of how the five moving parts connect.
- [Security model](./security-model) — the threat model and what's in scope.
- [Error handling philosophy](./error-handling-philosophy) — why the SDK fails open on analytics and fails closed on signatures.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
