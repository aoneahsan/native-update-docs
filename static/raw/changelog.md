All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [3.3.1] - 2026-07-16

### Changed
- README now documents the public management API and the `deploy` / release-control
  CLI commands added in 3.3.0. npm is where CI and agent users land, so the
  package's own front page needed to say the feature exists.

### Fixed
- Dashboard: the access-token form rendered a `<Badge>` (a block element) inside a
  `<p>`, so browsers auto-closed the paragraph and produced malformed DOM. Caught by
  running the page — type-check, lint, and build all passed it.

## [3.3.0] - 2026-07-16

### Added
- **Public Management API — manage your apps and releases over HTTP.** Everything
  the dashboard does (list apps, upload a bundle, publish, promote between
  channels, adjust a rollout, delete) is now an API at
  `https://nativeupdatebe.aoneahsan.com/api/public/v1`, for CI, scripts, and
  agents. Machine-readable spec:
  <https://nativeupdate-docs.aoneahsan.com/openapi/public-api.json>
- **Access tokens** — a new user-level credential (`nu_pat_…`), created in the
  dashboard under **Access Tokens**:
  - **App-scoped.** Tick the apps a token may manage; it reaches nothing else.
    Anything out of scope answers 404, never 403, so the API cannot be used to
    discover other people's apps.
  - **Permission split.** Every token has an implied `manage` (read, upload,
    publish, promote, rollout). **`builds.delete` is opt-in and off by default**,
    so a leaked CI token can ship a release but never erase your history.
  - **Retrievable.** Copy a token from the dashboard anytime, or rotate it — the
    old secret stops working immediately. Same posture as app API keys.
  - Distinct from app API keys (`nu_app_…`), which authenticate the plugin inside
    your app. The two are not interchangeable, and the public plane deliberately
    sends no CORS headers: an access token has no origin restrictions and belongs
    in a CI secret, never a browser.
- **Queued uploads with a job to poll.** `POST /apps/{app}/builds` answers **202**
  with `{job_id, status_url}` — a 202 means accepted, not live. Devices only ever
  receive `active` builds, so a release is invisible until `GET /jobs/{jobId}`
  reports `completed`. On failure the job reports `error`, the build never goes
  live, and the owner is emailed.
- **New CLI commands** (no new dependencies):
  - `native-update deploy <webDirOrZip> --app <app> [--wait]` — zips a directory
    if needed, uploads it, and with `--wait` blocks until the release is live,
    exiting non-zero if it fails, so a broken release fails your pipeline.
  - `native-update token info` · `apps list` · `builds list|promote|rollout|status|delete`
    · `jobs status`.
  - Auth via `NATIVE_UPDATE_TOKEN` (preferred — a `--token` flag leaks into shell
    history and CI logs); `NATIVE_UPDATE_SERVER` for self-hosted backends.

### Changed
- Bundle-upload logic (duplicate-version and monotonic-version guards, sync and
  queued storage paths, zero-copy promotion) moved into a shared
  `BuildUploadService`, so the dashboard and the public API cannot drift apart.
  No behaviour change to the dashboard.

### Backend
- Requires a deploy: two migrations (`access_tokens` + `access_token_app`,
  `api_jobs`) and a `RolesPermissionsSeeder` re-run for the new
  `access-tokens.manage` permission.

## [3.2.0] - 2026-07-14

### Added
- **API-key client restrictions — ship `nu_app_…` keys directly in your app,
  no self-hosted proxy needed.** In the dashboard (Apps → API Keys →
  Restrictions) you can now lock each key to its clients:
  - **Web** — allowed origins (exact `https://app.example.com` or a
    `https://*.example.com` wildcard), enforced against the browser's `Origin`
    header. The public update API (`/v1/updates/check`, analytics, signed
    download) is now callable straight from the browser (permissive CORS on
    that plane; the real gating is the per-key check, not CORS).
  - **Android** — allowed apps by package name + signing-cert SHA-256/SHA-1.
  - **iOS** — allowed apps by bundle identifier.

  A key with **no** restrictions keeps working from anywhere (unchanged,
  back-compatible). A restricted key that a client does not satisfy gets a
  `403 API_KEY_RESTRICTED` (the response never leaks the allowlist).
- **`LiveUpdate.getAppIdentity()`** returns this app's client identity
  (Android: applicationId + signing-cert SHA-256/SHA-1; iOS: bundle id; web:
  `{ platform: 'web' }`). Use it when you perform your OWN update-check fetch,
  then attach the `X-Android-*` / `X-Ios-*` headers. The plugin's native
  update-check attaches them automatically.

### Notes
- Android/iOS restrictions require the app to be built with **native-update
  ≥ 3.2.0** (older builds send no identity headers and will be blocked by an
  Android/iOS restriction). Web restrictions work with any version.
- The native identity headers are **client-attested** (parity with Google
  API-key app restrictions): they stop cross-site/casual key reuse and quota
  abuse, not a determined attacker replaying headers by hand. Only the web
  Origin check is browser-enforced.

## [3.1.5] - 2026-07-14

### Changed
- **npm `repository` link now points to the public documentation site**
  (`https://nativeupdate-docs.aoneahsan.com`) instead of the private source
  repository (which returned 404 for the public on the npm package page).
  Metadata-only release — no plugin code, API, or runtime changes.

## [3.1.4] - 2026-07-14

### Fixed
- **CLI `bundle create --version <v>` now works.** The long-form `--version`
  flag was swallowed by the root `-V, --version` option (commander's default
  parsing matches program options anywhere on the line), so
  `native-update bundle create ./dist --version 1.2.0` printed the CLI version
  and exited instead of building the bundle. The program and every parent
  command now use `enablePositionalOptions()`, so flags after a subcommand
  reach the leaf command. Short `-v` and the root `native-update --version`
  are unchanged.
- **CLI `bundle create` no longer crashes on `archiver` import.** `archiver`
  v8 is ESM with named-only exports (no default export), so the previous
  `import archiver from 'archiver'` threw at load. Migrated to the v8 API
  (`import { ZipArchive }` + `new ZipArchive({ zlib: { level: 9 } })`); the
  `.pipe()`/`.directory()`/`.finalize()` flow is unchanged.

## [3.1.3] - 2026-07-14

### Fixed
- **[CRITICAL] Native Android/iOS update checks now speak the real wire
  contract.** Both native layers previously called the dead
  `{serverUrl}/check` path with NO auth headers, so on-device `sync()` /
  `getLatest()` / background checks silently reported "up to date" forever
  against the hosted backend. They now issue
  `GET {serverUrl}/v1/updates/check?channel=…` with `X-API-Key`,
  `X-Device-ID` (stable per-install UUID, newly minted/persisted),
  `X-Current-Version` (active bundle version — Android previously
  hardcoded "1.0.0"), `X-Platform`, and `X-App-Version` (binary version),
  and parse the v3 response fields
  (`version`/`downloadUrl`/`checksum`/`signature`/`size`/`mandatory`/`releaseNotes`).
- **Flat `initialize(PluginInitConfig)` now configures the NATIVE layers
  too.** Native `configure`/`initialize` only accepted the wrapped
  `{ config: {...} }` shape and rejected the flat form outright, so
  serverUrl/apiKey never reached Android/iOS. Both shapes (plus nested
  `UpdateConfig`) are now accepted and normalized.
- **`configure({ liveUpdate })` can finally carry the API key** — new
  `LiveUpdateConfig.apiKey` field, mapped through to the config manager
  and the native layers.
- **Web `getLatest()` implemented** (was a hardcoded `{available:false}`
  stub) — now delegates to the shared `/v1/updates/check` implementation.
- **`@capacitor/filesystem` + `@capacitor/preferences` declared as
  peerDependencies** — the web path statically imports them, but they were
  only devDependencies, so consumers got runtime module-resolution failures
  with no install-time warning.
- **Legacy-key error is actionable:** `INVALID_API_KEY_FORMAT` now tells
  you to mint an `nu_app_…` key in the dashboard.

### Added
- **Dashboard API-key management** (backend + app detail page): create
  (max 3 active keys per app), rotate (replaces the secret in place; old
  value dies immediately), delete, and copy-anytime reveal (keys now stored
  encrypted at rest alongside the lookup hash — keys minted before this
  release can't be revealed, only rotated). Lifecycle actions are
  rate-limited per app from a DB-backed audit trail: create 1/hour,
  rotate 1/hour per key, and 10/30-days + 20/180-days caps per action —
  friendly 429s with retry timing. The ConfigPage now emits copy-paste
  snippets with the app's REAL bundle id, API key, and the canonical
  backend URL.

### Changed
- **Canonical `serverUrl` rule documented everywhere:**
  `https://nativeupdatebe.aoneahsan.com/api` — the plugin appends
  `/v1/updates/check`. Fixed the wrong `…/api/updates` examples in the
  website's AI docs dump and the stale `api.nativeupdate.aoneahsan.com`
  host in MIGRATION.md.
- **node-express example implements the real contract** (X-API-Key auth,
  contract field names, SHA-256 checksums at upload, semver comparison) —
  it previously served the legacy fictional shape.
- **Canonical documentation moved to
  [nativeupdate-docs.aoneahsan.com](https://nativeupdate-docs.aoneahsan.com)**
  (Docusaurus on GitHub Pages, CI-deployed on every push). README and all
  package links now point there; `nativeupdate.aoneahsan.com/docs/*` URLs
  301-redirect to the matching page, so previously published links keep
  working.
- **npm tarball slimmed.** `files[]` now ships a curated doc set
  (`docs/CHANGELOG.md`, `docs/MIGRATION.md`, `docs/server-requirements.md`,
  `docs/KNOWN_LIMITATIONS.md`) instead of the whole `docs/` tree — 134 files
  instead of 321, and internal planning material no longer ships to npm.
- **Docs corpus consolidated + corrected.** The duplicated in-repo consumer
  guides (quick start, feature guides, api/, getting-started/, guides/,
  examples set) were deleted in favor of the docs site; the retained docs
  were corrected to the real API (nested `configure` config, `SyncResult.status`,
  `canRequestReview().canRequest`, real event names, real
  `/v1/updates/check` wire contract, correct backend host).

- **react-capacitor example** `capacitor.config.ts` dropped inert config keys
  and the stale `analytics: { provider: 'firebase' }` block (Firebase was
  removed from the SDK in v3.0.0).

## [3.1.2] - 2026-07-14

### Fixed
- **npm README fully refreshed and de-contradicted.** Removed the false
  "yarn workspace / workspace:*" and "3 examples incl. Firebase backend"
  claims (two example apps; the example uses yarn's `portal:` protocol),
  replaced the legacy "What You Need to Build" scaffold section with an
  accurate "What Ships in This Package", corrected `startImmediateUpdate`
  → `performImmediateUpdate`, fixed the live-update example to the real
  `SyncResult.status` + `getLatest()` flow, corrected the requirement to
  Capacitor 8.x and the backend host to `nativeupdatebe.aoneahsan.com`.
- **AI-INTEGRATION-GUIDE.md now matches the real API.** Nested
  `UpdateConfig` for `configure()`, `SyncResult.status` enum,
  `download({url, version, checksum})`, `canRequestReview().canRequest`,
  the real event names, the `/v1/updates/check` wire contract (was a
  fictional `GET /api/check`), no nonexistent `bundle upload` command, and
  no legacy `play:core` Gradle instruction (the plugin bundles Play App
  Update + Play Review already).
- **Website docs viewer no longer renders the SPA shell as markdown.**
  Hosting rewrites answer `200 text/html` for missing files; the viewer now
  rejects HTML responses and falls through to the real file, so
  `/docs/AI-INTEGRATION-GUIDE` renders correctly and "View Raw Markdown"
  always points at an existing `.md` URL.

### Changed
- **Single source of truth for the version: root `package.json`.** The CLI
  already reads it; the website now bakes it into `__APP_VERSION__`,
  JSON-LD `softwareVersion`, `humans.txt`, and `llms-full.txt` at build
  time ({{PKG_VERSION}} placeholders), and `cli/package.json` no longer
  carries its own version field. No file hardcodes the version anymore.
- **Website `package-docs` copies are synced from the repo root on every
  build** (`yarn sync:package-docs`, refresh-only — internal docs are never
  newly published), ending the stale-copy drift (the public copy was stuck
  at the v2.0.0-era content).

## [3.1.1] - 2026-07-13

### Fixed
- **Update checks now share ONE wire-contract implementation.** New
  `src/core/update-check.ts` implements the `/v1/updates/check` contract;
  `plugin.ts`, the version manager, and the background scheduler's live
  fallback all route through it. The latter two previously called paths
  the backend never served (`/check`, `/updates/latest`), so their remote
  checks could never succeed against the hosted backend.

### Changed
- **Native app-store version paths documented as extension points.** The
  `/app-version` endpoints used by the native app-store update module are
  now explicitly documented (JSDoc + docs) as custom-backend extension
  points rather than hosted-backend routes. No public API changes.

## [3.1.0] - 2026-07-02

### Added
- **`exports` map in package.json.** Modern conditional exports
  (`types`/`import`/`require`) with `./dist/*` and `./cli/*` wildcard
  passthrough so existing deep imports keep resolving. Legacy
  `main`/`module`/`types`/`unpkg` fields retained.
- **`website/.env.production`.** Production builds now always bake the
  production backend URL; the dev `.env` can safely point at localhost.
- **Composite index `builds(app_id, channel, status, created_at)`.**
  Covers the update-check lookup's sort; removes a filesort from the
  hottest query.

### Changed
- **Update-check hot path (backend).** The two per-request DB writes
  (device activity + analytics event) now run after the response is
  sent (`dispatch(...)->afterResponse()`), and the latest-build lookup
  is cached for 45s with model-event invalidation. Rollout bucketing
  stays per-device and uncached.
- **`analytics:cleanup` now also prunes `analytics_events`** in 5000-row
  chunks (previously only device-activity rows; the events table grew
  unboundedly).
- **Web validateUpdate() reuses downloaded bundle bytes.** Validating a
  bundle right after `download()` no longer re-downloads it to hash.
- **Landing page animation engine loads lazily** (LazyMotion): ~44 KB
  of framer-motion moves off the first-paint critical path.
- **Firebase Hosting config consolidated** to the repo root with
  long-lived immutable caching for hashed assets and revalidation for
  HTML.
- CORS `supports_credentials` disabled (bearer-token auth needs no
  credentialed CORS).

### Removed
- 9 dead env keys from `website/.env` (Firebase-era), 10 commented-out
  debug lines in `src/web.ts`, 2 framework scaffold test files.

### Fixed
- Doc drift: backend is Laravel 13 (not 11); the test suite is PHPUnit
  (not Pest); canonical backend host is `nativeupdatebe.aoneahsan.com`.

## [3.0.1] - 2026-05-11

### Added
- **Documentation site.** A new public Docusaurus documentation site
  ships alongside the marketing site. 58 pages total: SDK reference
  (23), CLI reference (9), Backend setup (5), Platform guides (3),
  Tutorials (2), How-to guides (6), Concepts (6), Getting Started (2),
  About + intro pages. Full Diátaxis coverage. Lives in the sibling
  `native-update-docs/` repository; deployed to Firebase Hosting at
  `docs.nativeupdate.aoneahsan.com`. Discovery files (`robots.txt`
  with 30+ AI-bot allowlist, `llms.txt`, `llms-full.txt`, `humans.txt`,
  `.well-known/security.txt`, `sitemap-index.json`, `sitemap.xml`)
  and 3 JSON-LD blocks per page (WebSite, SoftwareApplication,
  Organization) for AI-search citability.
- **`docs/security/PRE-LAUNCH-PENTEST-CHECKLIST.md`.** 10-section
  DIY security checklist covering dep hygiene, authentication,
  authorization, CORS/CSRF, bundle integrity, file safety, data
  handling, operational safety, mobile platform integration,
  9 specific attack paths, and a final sanity sweep.
- **`docs/PERFORMANCE.md` + `tools/bench/`.** Vitest microbench
  scaffold for the SHA-256 checksum and RSA-SHA256 signature hot
  paths, with calibration targets and a regression-investigation
  workflow.
- **CI: example-bundle workflow.** `.github/workflows/example-bundle.yml`
  builds, signs, and attaches an OTA bundle from `example-apps/react-capacitor`
  to each GitHub Release. Also runs weekly as a drift-detection canary.
- **Example-app capability cards.** `example-apps/react-capacitor/src/App.tsx`
  now demonstrates App Update (`getAppUpdateInfo` + `openAppStore`),
  App Review (`canRequestReview` + `requestReview`), and Background
  Update (toggle with `allowMeteredConnection` + `nextCheckTime`)
  alongside the existing Live Update flow. One section per feature
  area.

### Fixed
- **`website/src/pages/ExamplesPage.tsx`.** Removed the stale third
  example card advertising the `example-apps/firebase-backend`
  directory, which was deleted in v3.0.0. The GitHub source link
  404'd and the description ("Firestore manifests") contradicted the
  website's own v3 architecture rule.

### Documentation
- **`docs/project-audit/MARKETING-WEBSITE-FINDINGS-2026-05-11.md`**
  produced by the production-readiness audit Batch 9 sweep. Documents
  3 deferred follow-ups (stale MDX docs mirror, HomePage missing
  Screenshots/Demo section, DocsPage size violation) and 7 surfaces
  confirmed healthy.
- **`docs/MARKETING_WEBSITE_TRACKER.md`** annotated as SUPERSEDED with
  a redirect block to the new findings doc.
- **`example-apps/react-capacitor/README.md`** documents the React 18
  vs 19 version-choice reasoning (the plugin is React-version-agnostic;
  the example pins React 18 to maximise readable audience).

### Closed
- **Production-readiness audit (10 batches)** initiated 2026-05-08 is
  complete as of 2026-05-11. Authoritative tracker:
  `docs/tracking/production-readiness-audit-tracker.json`. The flow
  enters a 7-day cooldown; next allowed re-run 2026-05-18.

## [3.0.0] - 2026-05-04

### Removed (BREAKING)
- **Firestore backend.** `backendType: 'firestore'` and the
  `firestore: { … }` config field are gone. The plugin now speaks HTTP
  to a single backend (the hosted Native Update SaaS / Laravel
  reference implementation in `backend/`). Apps using the Firestore
  branch must switch to `serverUrl` + `apiKey` — see
  [MIGRATION.md](https://unpkg.com/native-update/docs/MIGRATION.md).
- **`src/firestore/` module.** `FirestoreClient`, `ManifestReader`,
  `firestore.rules`, `firestore.indexes.json`, the schema types, and
  the `FirestoreConfig` public export are removed.
- **`example-apps/firebase-backend/`.** The standalone Firebase Cloud
  Functions example is removed; `example-apps/node-express/` is the
  reference HTTP implementation of the `/v1/updates/check` contract.

### Changed
- Rollout / device-info / update-check types moved to
  `src/types/rollout.ts` and are re-exported from the package root.
  `FirestoreTimestamp` is replaced by `RolloutTimestamp` (`number |
  string | Date`) with a `toEpochMs()` helper.
- Website auth-service drops the Firestore user-profile mirror. The
  Laravel `ValidateFirebaseToken` middleware already upserts the user
  record from verified token claims on every authenticated request, so
  the client mirror was redundant.

## [2.0.0] - 2026-04-18

### Native (Android + iOS)
- **Boot-time bundle re-verification.** On every cold start the plugin
  re-hashes the active OTA bundle and compares against the checksum
  stored at install time. If the host app configured a public key and the
  bundle carries a signature, the signature is re-verified too. Mismatch
  triggers an immediate rollback to the previous known-good bundle and
  emits `updateStateChanged` with `status: 'ROLLBACK'`. Closes an
  on-disk-tampering gap on rooted/jailbroken devices.
- **Automatic rollback on crash loop.** Activating a bundle marks it as
  pending-verify. Each cold start before `notifyAppReady()` fires
  increments a counter; after 2 failed boots the plugin rolls back to
  the previous bundle automatically. Catches a bundle that crashes the
  app before it can tell the plugin it booted cleanly.
- Bundle metadata now persists the signature alongside checksum so the
  boot re-verify can run without needing the manifest or a re-download.
- **iOS zip-slip + zip-bomb protection.** Bundle extraction now inspects
  every archive entry before writing to disk: rejects symlinks, absolute
  paths, and any path that resolves outside the destination directory,
  and caps total uncompressed size at 500 MB. A malicious bundle can no
  longer overwrite files outside the sandbox or exhaust device storage.
  (Android does not currently extract bundles in-plugin; when that is
  added, the same validation must be applied.)
- **Secure storage is now always on.** Android persists secrets only
  through `EncryptedSharedPreferences` (Keystore-backed); iOS persists
  only through the Keychain. The `secureStorage: false` opt-out is
  removed — passing it is ignored. On web, `initialize()` config is
  sanitised before write-through to `localStorage`: `apiKey`, top-level
  and `liveUpdate.publicKey`, and `security.publicKey` are stripped, so
  a compromised script or stale cache cannot surface the credential.
  Host apps must pass the apiKey/publicKey on every `initialize()`.
- **Android background retries are bounded + backoff-aware.** All three
  enqueue sites (periodic, one-shot, notification-action) now pass
  `setBackoffCriteria(EXPONENTIAL, 30s)`. The worker itself caps at
  5 retry attempts per run, so a persistently-failing server can no
  longer burn battery in a tight retry loop — total wall-clock budget
  for a failing run is ~15 minutes before falling through to the next
  scheduled tick.
- **iOS background-task diagnostics.** `BGTaskScheduler.submit` errors
  are now classified (`.notPermitted`, `.tooManyPendingTaskRequests`,
  `.unavailable`) and logged with actionable messages. `.notPermitted`
  almost always means the host app's `Info.plist` is missing the
  scheduler identifier — previously a silent failure. We also cancel
  any prior pending request before resubmitting to dodge the
  "already-scheduled" edge case observed on a few iOS versions. Host
  apps must declare `BGTaskSchedulerPermittedIdentifiers` with
  `com.aoneahsan.nativeupdate.background` in their own Info.plist —
  the framework's plist does not propagate to the app bundle.

### Security (BREAKING)
- **Signature verification fails closed.** If the host app configures
  `publicKey`, `requireSignature`, or `enableSignatureValidation`, a missing
  signature now throws instead of silently passing. Previously, a manifest
  with the signature field stripped out would bypass all integrity checks.
- **Checksum verification fails closed.** `verifyChecksum(data, '')` now
  throws. Every OTA bundle manifest must ship a SHA-256 checksum; a missing
  one is treated as tampering.
- **Monotonic version enforcement persists across reinstalls.** The plugin
  now records the highest version ever applied per channel in Preferences
  and refuses to apply any older bundle — even if the active-bundle state
  was wiped. Closes a downgrade-attack path.
- **`setUpdateUrl()` is deprecated and ignored at runtime.** The update
  server URL is fixed at `initialize()` time. Runtime mutation was an XSS
  attack path (compromised WebView could repoint updates to a hostile
  host). Re-call `initialize()` to switch servers.
- **Removed `allowDowngrade` from `UpdateOptions`.** Downgrades are a
  debug/recovery operation and do not belong in a production option flag.
- **Removed `enableEncryption`, `encryptionKey`, `encryptionSalt` from
  the public API.** Bundle encryption was only wired on the web path and
  never implemented on Android or iOS — the option shipped a false
  guarantee. Sign bundles (RSA-PSS/ECDSA) and serve them over HTTPS; the
  plugin's existing verification is the correct integrity primitive.

### Backend (native-update/backend)
- API key checksum comparison uses `hash_equals` (timing-safe) — closes a
  byte-by-byte response-time leak on brute-force against short suffixes.
- Bundle download asserts `build->app_id === authenticated app->id` as
  defense-in-depth beyond the signed URL.
- Device identifiers are HMAC-SHA256 hashed (keyed by `APP_KEY`) via an
  Eloquent mutator before landing in `analytics_events` and
  `device_activities`. Casual DB access can no longer correlate a row back
  to a specific device.
- Build upload rejects versions ≤ current channel head unless an explicit
  rollback flow is used. Prevents accidental and malicious downgrades on
  live channels.
- `GET /api/health` unauth'd endpoint added for Hostinger uptime pings.
- `/api/v1/*` now carries a route-level `throttle:600,15` as
  defense-in-depth on top of per-key rate limiting in middleware.
- `.env.example` tightened for production defaults: `APP_ENV=production`,
  `APP_DEBUG=false`, `LOG_LEVEL=warning`, `LOG_CHANNEL=daily`,
  `DB_CONNECTION=mysql`.
- **Signed bundle URLs include checksum + app_id in their signed payload**
  and `BundleController::download` re-asserts both against the `Build`
  row before streaming. A replayed URL whose Build was flipped to
  archived now returns 403 instead of serving the old bundle.
- **Signed URL TTL moved from 5 minutes → 30 minutes and made
  configurable** via `NATIVE_UPDATE_DOWNLOAD_TTL_MIN`. Five minutes
  frequently expired mid-download on a slow mobile link.
- **Bundle downloads stream through Laravel**, never redirect to the
  underlying storage URL — comment enforces the invariant. Keeps auth,
  rate-limit, and audit in one chokepoint.
- **Signing-key decryption is now per-request memoised** in
  `SigningKey::getPrivateKey()`. `rotate()` and `revoke()` clear the
  cache so stale keys can't leak across a long-running worker.

### Optimization
- **Resume-download correctness.** `resumeDownload()` now records whether
  the server actually returned HTTP 206 (Partial Content) and decides
  whether to concatenate the partial prefix or discard it accordingly.
  Previously a server that fell back to HTTP 200 (full response)
  silently produced a corrupted bundle by double-writing the prefix —
  a latent corruption bug on CDNs that don't honour Range.
- **Jittered exponential backoff on download retry.** `downloadWithRetry`
  now adds ±25% random jitter to each retry interval. Avoids the
  thundering-herd scenario where many clients retry in lockstep after a
  common failure (CDN blip, server restart) and hammer a recovering
  server simultaneously.
- **Auto-cleanup is now the default.** After a successful bundle apply
  the plugin keeps the last 3 bundles (active + 2 recent) and deletes
  the rest. Host apps that want the old every-bundle-forever behavior
  can pass `cleanupOldBundles: false` explicitly.

### Payments (BREAKING)
- **Stripe + Cashier removed; PayPal (`srmklive/paypal`) takes over.**
  New `SubscriptionController` exposes `subscribe → activate → cancel /
  resume / changePlan` with PayPal's approval-URL flow. Webhook endpoint
  moved from `/api/webhooks/stripe` → `/api/webhooks/paypal`, with a new
  `PayPalWebhookController` that verifies transmissions via PayPal's
  own `verifyWebHook` API.
- New migration `2026_04_18_000001_add_paypal_provider_to_subscriptions`
  introduces provider-agnostic columns (`provider`,
  `provider_subscription_id`, `provider_status`, `provider_plan_id`) on
  `subscriptions`, `subscription_items`, and `users`. Legacy `stripe_*`
  columns are kept nullable for one release to ease rollback.
- `.env.example` replaces `STRIPE_*` with `PAYPAL_MODE`,
  `PAYPAL_LIVE_CLIENT_ID / SECRET / APP_ID`, `PAYPAL_PLAN_PRO`,
  `PAYPAL_PLAN_ENTERPRISE`, `PAYPAL_WEBHOOK_ID`.
- `User` model drops the Cashier `Billable` trait and grows an
  `activeSubscription()` helper against the new schema.

### Migration
- Apps relying on `allowDowngrade: true` in `UpdateOptions` will fail to
  apply older bundles. Remove the flag and treat rollback as a separate
  flow.
- Apps passing `enableEncryption`, `encryptionKey`, or `encryptionSalt`
  to `initialize()` or `configure()` will see them silently dropped.
  Rely on signature + checksum verification for integrity.
- Apps calling `setUpdateUrl()` at runtime will receive a deprecation
  warning and the call is a no-op. Pass `serverUrl` to `initialize()`.

## [1.4.9] - 2026-03-11

### Added
- Firestore-backed manifest reads through `backendType: 'firestore'`
- Secure manifest lookup support via `apiKeys/{apiKey}/manifests/{channel}`
- Concrete no-cost backend implementation guide for `website + Firestore + Google Drive`

### Changed
- Website dashboard publish flow aligned to Google Drive asset uploads plus Firestore manifest publishing
- Website dashboard configuration/docs now recommend Firestore instead of the old `/api/updates` path
- Package config types now expose Firestore configuration for production app integration

### Fixed
- Manifest publishing now writes the full manifest shape to both secure and compatibility Firestore paths
- Google Drive asset uploads now preserve correct filenames for ZIP bundles and generated manifest files

## [1.4.5] - 2026-02-25

### Changed
- Updated all dependencies to latest versions
- Full verification suite passing (81 tests, 0 lint warnings)
- Android Gradle build verified (assembleDebug successful)
- Website and Firebase Functions builds verified
- Release-ready state confirmed

### Maintenance
- Package updates: Capacitor 8.x, TypeScript 5.9.3, Vitest 4.0.18, ESLint 9.39.2
- Node.js engine requirement: >=24.13.0

## [1.0.7] - 2025-01-15

### Fixed
- **Critical Android Build Issues**:
  - Fixed Google Play app-update library dependencies by using explicit version 2.1.0 instead of variable
  - Resolved kotlinVersion resolution issues by hardcoding version in gradle plugin
  - Made all Google Play Services dependencies use explicit versions to prevent resolution errors
  - Added variables.gradle file for better variable management
  - Ensured no manual intervention is required by users

### Changed
- Updated package version to 1.0.7
- Hardcoded critical dependency versions in Android build.gradle to prevent resolution issues

## [1.0.6] - 2025-01-15

### Fixed
- **Android Build Issues**:
  - Fixed Google Play app-update library version error (changed from non-existent 18.2.0 to correct 2.1.0)
  - Fixed `kotlinVersion` MissingPropertyException by properly defining it in buildscript ext block
  - Added missing Kotlin stdlib dependency
  - Reorganized build.gradle structure to ensure proper variable scope

### Documentation Fixes
- Corrected all API method references to match TypeScript definitions
- Fixed method signatures and parameters across all documentation
- Updated event names to match the 4 defined events (downloadProgress, updateStateChanged, backgroundUpdateProgress, backgroundUpdateNotification)
- Removed references to non-existent methods
- Fixed broken documentation links

### Android Configuration
- kotlinVersion: 1.9.22 (stable version)
- playAppUpdateVersion: 2.1.0 (correct Google Play version)
- playReviewVersion: 2.0.1
- All dependencies now use proper version variables

## [1.4.0] - 2025-01-02

### Added

- Complete TypeScript implementation with strict typing
- Core plugin architecture with modular design
- Comprehensive error handling system
- Security validation framework
- Bundle management system
- Download manager with retry logic
- Version management capabilities
- Configuration manager
- Logging system with multiple log levels
- Cache management
- Background update support
- Plugin initialization system

### Changed

- Migrated from class-based to functional architecture
- Improved type definitions and interfaces
- Enhanced security with input validation
- Better error messages and error codes

### Fixed

- Removed circular dependencies
- Fixed TypeScript compilation issues
- Proper exclusion of test files in tsconfig
- Removed console.log statements in favor of Logger

## [0.0.2] - 2024-12-01

### Added

- Comprehensive documentation for all features
- Bundle signing and security utilities
- CI/CD pipeline with GitHub Actions
- Example update server implementation
- TypeScript strict mode
- ESLint v9 flat config support

### Fixed

- Security vulnerabilities in update process
- TypeScript compilation errors
- Path traversal prevention

### Security

- Enforced HTTPS for all update downloads
- Added RSA signature verification
- Implemented checksum validation
- Added certificate pinning support

## [0.0.1] - 2024-01-08

### Added

- Initial release of Capacitor Native Update plugin
- Live/OTA update functionality
  - Bundle download and management
  - Multiple update strategies (immediate, background, manual)
  - Delta update support
  - Automatic rollback on failed updates
  - Update channels (production, staging, development)
  - End-to-end encryption and signature verification
  - Bundle integrity checks with SHA-256/512 checksums
- Native app update functionality
  - App store version checking
  - Immediate and flexible update flows (Android)
  - Direct app store navigation
  - Version comparison and update priority
- App review functionality
  - In-app review prompts using native APIs
  - Smart triggering with configurable conditions
  - Rate limiting to respect platform quotas
- Security features
  - HTTPS enforcement by default
  - Certificate pinning support
  - Public key signature verification
  - Input validation and sanitization
  - Secure storage using platform keystores
- Platform support
  - iOS implementation using Swift
  - Android implementation using Kotlin
  - Web fallback implementation
- Comprehensive TypeScript definitions
- Example application demonstrating all features
- Extensive documentation
  - API reference
  - Security guidelines
  - Migration guide
  - Feature overview

### Security

- Enforced HTTPS for all update operations by default
- Required checksum validation for all bundle downloads
- Implemented path traversal prevention
- Added secure storage for sensitive configuration

### Known Issues

- ESLint configuration needs update for v9 compatibility
- Certificate pinning requires manual certificate configuration
- Delta updates require server-side implementation

## Future Releases

### [0.1.0] - Planned

- Add delta update server reference implementation
- Improve offline update handling
- Add update scheduling APIs
- Enhanced progress reporting with ETA
- Batch update support

### [0.2.0] - Planned

- Machine learning for optimal update timing
- Peer-to-peer update distribution
- Advanced A/B testing framework
- Custom update UI components
- Differential compression algorithms
