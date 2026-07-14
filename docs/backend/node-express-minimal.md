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

Four endpoints, plus a health check. Since v3.1.3 the example implements the **real wire contract** — the same path, headers, and response field names the hosted Laravel backend uses:

| Method | Path | Maps to SDK call |
|---|---|---|
| `GET` | `/api/health` | (operations only) |
| `GET` | `/v1/updates/check?channel=` (headers: `X-API-Key`, `X-Current-Version`, `X-Device-ID`, `X-Platform`) | `NativeUpdate.sync()` / `checkForUpdate()` / `getLatest()` |
| `GET` | `/v1/bundles/:id/download` | The download URL returned by the check |
| `POST` | `/api/bundles/upload` | Your CI / release script |
| `GET` | `/api/bundles` | Operator-only browse endpoint |

Point the SDK at it with `serverUrl: 'http://localhost:3000'` (the plugin appends `/v1/updates/check`) and `apiKey: 'demo-key'` (override with the `API_KEY` env var; requests without it get `401`).

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
app.get('/v1/updates/check', async (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing X-API-Key header' });
  }

  const channel = req.query.channel || 'production';
  const currentVersion = req.headers['x-current-version'] || '';

  const metadata = await getMetadata();
  const latestBundle = metadata.bundles
    .filter((b) => b.channel === channel && b.active)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!latestBundle || !isNewerVersion(latestBundle.version, currentVersion)) {
    return res.json({ available: false, message: 'No updates available' });
  }

  res.json({
    available: true,
    version: latestBundle.version,
    bundleId: latestBundle.id,
    downloadUrl: `http://localhost:${PORT}/v1/bundles/${latestBundle.id}/download`,
    checksum: latestBundle.checksum,
    signature: latestBundle.signature || null,
    size: latestBundle.size,
    mandatory: false,
    releaseNotes: latestBundle.releaseNotes || null,
  });
});
```

The contract, as the example now demonstrates:

`available: boolean` — always present, always `200 OK`. Never `404` for "no update". The SDK distinguishes "no update" from "endpoint broken" via this flag.

`X-API-Key` header — required; `401` without it. The example accepts one static key; real backends bind keys to apps.

`version` — the SemVer string identifying the bundle (canonical field name, matching the Laravel reference). The example only offers versions **greater than** the device's `X-Current-Version` (proper SemVer compare, not string inequality).

`bundleId` — correlates analytics events back to a build.

`downloadUrl` — full absolute URL. The SDK does not concatenate base URLs. Cross-origin URLs are fine; localhost-relative URLs break for mobile devices.

`checksum` — SHA-256 hex, computed at upload time. The SDK verifies it before applying a bundle.

`signature` — base64 signature over the bundle bytes; the example passes through whatever the upload provided (or `null`). **Production deployments should sign bundles.**

`size` — bytes. Drives the SDK's download progress callback.

`mandatory` — when `true`, the SDK applies the update on the next launch without prompting. The example always answers `false`.

`releaseNotes` — human-readable string. Surfaced to your in-app update prompt.

Still missing compared to Laravel: `minNativeVersion` (binary-version gate) and `expiresAt` with signed download URLs (the Laravel reference uses a 30-minute signed-route TTL; the example serves static IDs forever — **for production, generate signed URLs**). The analytics endpoints are also skipped, as noted above.

### The download endpoint

```js
app.get('/v1/bundles/:id/download', async (req, res) => {
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

  const fileBuffer = await fs.readFile(req.file.path);
  const checksum = createHash('sha256').update(fileBuffer).digest('hex');

  const metadata = await getMetadata();
  const bundleId = `bundle-${Date.now()}`;
  const newBundle = {
    id: bundleId, version, channel,
    filename: req.file.filename, size: req.file.size,
    checksum, signature: signature || null,
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
