---
sidebar_position: 3
title: Node + Express Minimal Backend
description: The example-apps/node-express reference is the smallest backend that implements the native-update HTTP contract. ~160 lines of Express + multer, JSON-file metadata, no auth, no signing — meant to be read in one sitting and adapted.
keywords: [native-update node express, minimal ota backend, capacitor express server, native-update http contract example]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Node + Express Minimal Backend

The `example-apps/node-express/` directory in the `native-update` repository is the smallest backend that satisfies the SDK's HTTP contract. It is one file (`index.js`, around 160 lines), with no auth, no signing-key handling, no rollout logic, and no database — bundle metadata persists in a JSON file. Read it as a reference for what the contract demands, not as a starting point for production.

If you want a turn-key production backend, read [Self-Host Laravel + Nova](./laravel-nova-self-host). If you want a starting skeleton with TODO markers in your preferred framework, run the [`backend create`](/reference/cli/backend-create) CLI command. The Express example sits between those two — useful for explaining the contract by example, useful in your test environment, not useful in production as written.

## What it implements

Four endpoints, plus a health check:

| Method | Path | Maps to SDK call |
|---|---|---|
| `GET` | `/api/health` | (operations only) |
| `GET` | `/api/updates/check?version=&channel=` | `NativeUpdate.sync()` / `checkForUpdate()` |
| `GET` | `/api/updates/download/:id` | The download URL returned by the check |
| `POST` | `/api/bundles/upload` | Your CI / release script |
| `GET` | `/api/bundles` | Operator-only browse endpoint |

It does **not** implement the SDK's analytics endpoints (`/api/v1/analytics/mau`, `/api/v1/analytics/download`, `/api/v1/analytics/install`). The SDK's analytics writes fail-open — losing them does not break the update flow — so the example skips them. Add them when you need MAU billing or download dashboards.

## Running it locally

```bash
cd example-apps/node-express
yarn install        # express, cors, multer
node index.js
# → 🚀 Update server running on http://localhost:3000
```

Point your `native-update.config.js` at `http://localhost:3000` (or your LAN IP for mobile devices on the same Wi-Fi) and the SDK's `sync()` call will reach this server. Mobile devices cannot resolve `localhost` to your dev machine — use the LAN IP printed by `ip addr` on Linux or `ifconfig` on macOS.

## How the contract maps to the code

### The update-check endpoint

```js
app.get('/api/updates/check', async (req, res) => {
  const { version, channel = 'production' } = req.query;
  const metadata = await getMetadata();

  const latestBundle = metadata.bundles
    .filter((b) => b.channel === channel && b.active)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!latestBundle) {
    return res.json({ available: false, message: 'No updates available' });
  }

  const updateAvailable = latestBundle.version !== version;

  res.json({
    available: updateAvailable,
    latestVersion: latestBundle.version,
    downloadUrl: `http://localhost:${PORT}/api/updates/download/${latestBundle.id}`,
    size: latestBundle.size,
    releaseNotes: latestBundle.releaseNotes || 'Bug fixes and improvements',
  });
});
```

The contract requires:

`available: boolean` — always present, always `200 OK`. Never `404` for "no update". The SDK distinguishes "no update" from "endpoint broken" via this flag.

`latestVersion` / `version` — the SemVer string the bundle is identified by. The Laravel reference uses the field name `version`; this example uses `latestVersion`. **The Laravel name is canonical** — if you adopt this example, rename the field or the SDK won't pick it up reliably.

`downloadUrl` — full absolute URL. The SDK does not concatenate base URLs. Cross-origin URLs are fine; localhost-relative URLs break for mobile devices.

`size` — bytes. Drives the SDK's download progress callback.

`releaseNotes` — human-readable string. Surfaced to your in-app update prompt.

What's missing compared to Laravel:

`bundleId` — needed by the analytics endpoints to correlate downloads / installs back to a build. Add it if you implement analytics.

`checksum` (SHA-256 hex) and `signature` (base64 RSA-SHA256 over the bundle bytes) — the SDK's signature-verification step (`bundle verify` logic, but on-device) checks both. Without them, your bundles are trusted by URL alone, not by content. **Production deployments must add these.**

`mandatory` — when `true`, the SDK applies the update on the next launch without prompting. Skip and the SDK assumes optional.

`minNativeVersion` — when set, the SDK refuses to install the bundle if the user's app-store binary is older. Lets you ship bundles that depend on native code added in a newer store release.

`expiresAt` — when set, the SDK treats the `downloadUrl` as ephemeral. The Laravel reference uses a 30-minute Laravel-signed-route TTL; this example uses static IDs forever. **For production, generate signed URLs.**

### The download endpoint

```js
app.get('/api/updates/download/:id', async (req, res) => {
  const metadata = await getMetadata();
  const bundle = metadata.bundles.find((b) => b.id === req.params.id);
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

  const filePath = path.join(bundlesDir, bundle.filename);
  res.download(filePath);
});
```

Three things to upgrade for production:

The lookup is by raw ID, which means anyone who has ever seen any download URL can re-fetch it forever. Production deployments use signed URLs that expire — see Laravel's `URL::temporarySignedRoute` for the canonical pattern, or pre-signed S3 URLs.

`res.download(filePath)` sends `Content-Disposition: attachment` and lets Express handle range requests. Add `Content-Length` and an `X-Bundle-Checksum` header to match the Laravel reference — the SDK uses both for resumable downloads and integrity logging.

No rate limiting. A leaked URL can be hammered. Add `express-rate-limit` keyed on the download token if you adopt this for anything customer-facing.

### The upload endpoint

```js
app.post('/api/bundles/upload', upload.single('bundle'), async (req, res) => {
  const { version, channel = 'production', releaseNotes } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const metadata = await getMetadata();
  const bundleId = `bundle-${Date.now()}`;
  const newBundle = {
    id: bundleId, version, channel,
    filename: req.file.filename, size: req.file.size,
    releaseNotes, timestamp: Date.now(), active: true,
  };
  metadata.bundles.push(newBundle);
  await saveMetadata(metadata);
  res.json({ success: true, bundle: newBundle, message: 'Bundle uploaded successfully' });
});
```

This endpoint is for your CI / release script, not for the SDK. It accepts a multipart upload with a `bundle` file and `version` + `channel` + `releaseNotes` fields. It has **no auth at all** — anyone on the network can push a bundle and clients will pick it up on next sync. Add JWT or API-key auth before exposing this to anything beyond your local dev machine.

A typical release script:

```bash
yarn build
npx native-update bundle create ./dist --version 1.2.0 --channel production
npx native-update bundle sign  ./update-bundles/bundle-*.zip --key ./keys/private.pem

curl -X POST http://localhost:3000/api/bundles/upload \
  -F "bundle=@./update-bundles/bundle-1.2.0-*.signed.zip" \
  -F "version=1.2.0" \
  -F "channel=production" \
  -F 'releaseNotes=Bug fixes for the cart page.'
```

The example does not record the `.sig` sidecar — if you carry signing through, extend the upload endpoint to accept and persist it alongside the bundle.

## Why JSON-file persistence

`getMetadata()` and `saveMetadata()` read and write `metadata.json` on every request. This is fine for a single-process dev server and breaks immediately on a multi-process deploy or under any concurrency — two simultaneous uploads race the file and the loser's metadata is lost.

Replace with SQLite (one binary file, zero ops overhead, handles concurrent writes via WAL) for ~50 lines of extra code, or with Postgres / MySQL once you outgrow that. The Laravel reference uses MySQL by default.

## Adapting this to other frameworks

The contract is small enough that translating to Hono, Fastify, Koa, FastAPI, Echo, or Gin is a same-day exercise. Three things to carry over:

The response shape from `/api/updates/check` is the contract surface — match Laravel's field names (`version`, `bundleId`, `downloadUrl`, `checksum`, `signature`, `size`, `mandatory`, `releaseNotes`, `minNativeVersion`, `expiresAt`) and the SDK will work without modification.

The download endpoint should stream the bundle (not load it into memory) and emit `Content-Type: application/zip` + `Content-Length` + an integrity header. The Laravel reference uses `X-Bundle-Checksum`; copy that header name.

Authentication on the public SDK endpoints is via the `X-API-Key` header. Hash the key on the server, scope each key to one app, and rate-limit per-key. Never log full API keys.

Everything else — admin dashboard, signing-key rotation, rollout percentages, MAU billing — you add as features of your platform, not as parts of the SDK contract.

## When to graduate beyond this example

Once you find yourself wanting any of these, you have outgrown the JSON-file example:

A second build agent uploading bundles. Two writers means file-locking issues. Move to SQLite or Postgres.

More than one channel with different access patterns. Channel scoping wants real query support, not array `filter` calls.

A staging-vs-production environment split where the same code runs in both. JSON-file persistence breaks horizontal scaling. Move to a real DB.

Multiple customers (multi-tenant). At that point you should be reading the Laravel reference, not adapting the Express example.

Any auditing / observability requirement. Bare Express has nothing — add `pino` or use a real framework.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
