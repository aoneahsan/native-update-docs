---
slug: native-update-3-4-0
title: Native Update 3.4.0
description: "Native Update 3.4.0 release notes: the full app lifecycle on the Public Management API, the all_apps token scope and new CLI commands."
tags: [release]
date: 2026-07-23
mdx:
  format: md
---

Native Update 3.4.0 was published on npm on 2026-07-23. The full release history is in the [changelog](/changelog).

<!-- truncate -->

## [3.4.0] - 2026-07-23

### Added
- **Full app lifecycle on the Public Management API.** Beyond builds, the
  `/api/public/v1` plane now creates, edits, and deletes **apps**; manages an
  app's **API keys** (list, create, rotate, reveal, restrict, revoke, deprecate,
  delete — the secret is only ever shown on create/rotate/reveal); manages its
  **signing key** (show public key + fingerprint, create, rotate — the private
  key never leaves the server); and stores a private **keystore backup** (upload
  and download a `.zip` up to 10 MB, held with private visibility and only ever
  streamed back through the API, never a public URL). CI or an agent can now
  provision and run an app end to end without the dashboard. Machine-readable
  spec: <https://nativeupdate-docs.aoneahsan.com/openapi/public-api.json>
  (now v1.1.0), with a front-matter-stripped Markdown mirror at `/raw/*.md`
  indexed by `/raw/manifest.json`.
- **`all_apps` token scope.** An access token can now cover **every app you own**
  — the ones you have and any created later — instead of a fixed ticked list.
  Creating an app with a specifically-scoped token auto-attaches the new app to
  it. `GET /token` reports `all_apps`.
- **Two more opt-in delete permissions.** Alongside `builds.delete`, a token can
  be granted `apps.delete` and `keys.delete` (both off by default). Deleting an
  app or a key without the matching permission answers
  `403 TOKEN_PERMISSION_DENIED`. Access tokens themselves stay **dashboard-only**
  — nothing on the API can create, rotate, or delete one.
- **Build controls:** a `mandatory` flag on upload and edit; a `BUILD_NOT_READY`
  guard so a build cannot be forced `active` before its upload job completes; and
  rollout pause/resume via `enabled`, alongside the percentage (`0` halts).
- **New CLI commands** for the whole surface: `apps create|show|update|delete`,
  `apps keys list|create|show|rotate|reveal|revoke|deprecate|restrict|delete`,
  `apps signing show|create|rotate`, and
  `apps keystore upload|info|download|delete`. Auth via `NATIVE_UPDATE_TOKEN`, as
  with `deploy`.

### Backend
- Requires a deploy: new public-plane controllers and routes for app CRUD,
  API-key management, signing keys, and the keystore backup; migrations for the
  keystore backup and the `all_apps` token flag; and a permissions seeder re-run
  for the new `apps.delete` and `keys.delete` permissions. 423 PHPUnit tests pass.
