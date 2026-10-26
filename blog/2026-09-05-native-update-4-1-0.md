---
slug: native-update-4-1-0
title: Native Update 4.1.0
description: "Native Update 4.1.0 release notes: a locally signed bundle can now be uploaded with its signature, and deploy picks up the sibling .sig file."
tags: [release]
date: 2026-09-05
mdx:
  format: md
---

Native Update 4.1.0 was published on npm on 2026-09-05. The full release history is in the [changelog](/changelog).

<!-- truncate -->

## [4.1.0] - 2026-09-05

### Fixed

- **A locally-signed bundle can now actually be uploaded (ISSUE-08).** `builds.signature` existed, the model
  exposed it and `/v1/updates/check` already served it — but no upload validation accepted a signature and
  neither store path set one from input. So `native-update bundle sign` produced a detached `.sig` that
  nothing could carry to the server, every build landed `signature: null`, and an app configured
  `requireSignature: true` rejected the download **on device**, indistinguishable from "no update arrived".
  `POST /apps/{app}/builds` now accepts an optional `signature` on both the dashboard and public planes,
  stores it, and serves it on the update-check.

### Added

- `native-update deploy --signature <file>`, and **automatic pick-up of the sibling `.sig`** that
  `bundle sign` writes — the documented local-signing flow now works end to end without a new flag to learn.
- `bundle sign` records `bundleSha256` in its `.sig`, and `deploy` **refuses** to upload a signature whose
  checksum does not cover the bundle being sent. The server cannot detect that mismatch (it holds no public
  key to check against), so without this guard a stale `.sig` would publish a release every device rejects.

### Notes

- A caller-supplied signature **wins over server-side signing** and is never silently replaced — signing a
  consumer's bundle with the server key would produce a release that fails on device while every server-side
  check looked healthy.
- The server deliberately does **not** verify a caller-supplied signature: it never holds that public key.
  Verification happens on the device, against the key compiled into the binary, where it fails closed.
