---
slug: native-update-4-0-0
title: Native Update 4.0.0
description: "Native Update 4.0.0 release notes: real delta delivery, Capacitor 8 and current toolchain requirements, RSA-SHA256 signatures and locked configuration."
tags: [release]
date: 2026-08-05
mdx:
  format: md
---

Native Update 4.0.0 was published on npm on 2026-08-05. The full release history is in the [changelog](/changelog).

<!-- truncate -->

## [4.0.0] - 2026-08-05

### Added

- **Real delta delivery.** The canonical backend generates deterministic `NUDELTA/1` copy/literal
  patches from the last three compatible active builds, stores only patches smaller than 85% of the
  full target archive, and advertises them on the existing update-check response. Web, Android, and
  iOS validate the patch checksum, source checksum, operation bounds, target size, and final target
  checksum; every failure falls back to the signed full bundle.
- Active GitHub Actions gates for the plugin, website, Laravel backend, Android, iOS, CLI, examples,
  dependency audits, publish-artifact inspection, and the no-source-map policy.
- Focused TypeScript delta tests and Laravel reconstruction/signed-download tests; the backend suite
  now contains 426 passing tests (1,253 assertions), alongside 83 Android plugin tests.

### Changed

- Requires Capacitor 8, Node.js 24.16+, Java 21, Android API 26+, Android compile/target SDK 36,
  Gradle 8.14.5, and current supported dependencies across every monorepo unit.
- Standardizes the wire and all verifiers on `RSA-SHA256` (RSASSA-PKCS1-v1_5 with SHA-256), matching
  the backend signer. Removed false RSA-PSS/ECDSA fallback claims.
- Configuration is immutable after initialization. `setUpdateUrl()` remains a deprecated no-op;
  changing locked settings requires `reset()` followed by a new `initialize()`/`configure()` call.
- Android sensitive configuration now uses a non-exportable Android Keystore AES-256-GCM key rather
  than deprecated EncryptedSharedPreferences. iOS Keychain entries are device-only.
- Reveal endpoints for retrievable API/access-token secrets are POST-only, rate-limited, audited,
  and return no-store headers. Keystore replacement validates ZIP structure and uploads the new
  private object before deleting the old one.

### Fixed

- Native bridge return/argument shape drift, omitted iOS bridge methods, double-resolved
  initialization calls, nonfunctional background helper instances, fake worker responses, download
  cancellation tracking, boot-time signed-ZIP deletion, and inconsistent HTTPS/host/path checks.
- PayPal subscription plan changes now call the vendor-supported revise operation.
- The published examples and marketing snippets now use the real package name, v4 configuration
  shape, signed manifest fields, delta-aware download helper, and Capacitor 8 APIs.

### Backend deploy required

- Apply `2026_08_05_000001_create_delta_patches_table.php`, rebuild Laravel caches, restart PHP-FPM
  when needed for OPcache, and verify `/api/version` returns `2026.08.05.1`.
