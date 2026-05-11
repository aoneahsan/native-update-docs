---
sidebar_position: 7
title: server start — Run a local dev update server
description: native-update server start runs a tiny Express server that serves bundles from a local directory. Designed for testing the device-side sync flow against your own machine before deploying a real backend.
keywords: [native-update server start, local ota dev server, capacitor update test server, native-update express dev]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `server start` — Run a local dev update server

**`native-update server start` runs a tiny Express server that serves bundles from a local directory.** It exposes the same `/api/latest` and `/bundles/<filename>` endpoints the SDK expects, so you can test the device-side sync flow against your own machine — useful for verifying a bundle works before pushing it to a real backend.

This is a **development tool**. It has no auth, no rate limiting, no persistence, and no rollout logic. Use the Laravel reference backend (`backend/`), the hosted SaaS, or a real production server for anything other than local testing.

## Synopsis

```bash
npx native-update server start [options]

# Alias:
npx native-update server start-server [options]
```

## Flags

| Flag | Default | Description |
|---|---|---|
| `-p, --port <port>` | `3000` | Port to listen on. Make sure it does not collide with other services. |
| `-d, --dir <dir>` | `./update-bundles` | Directory containing bundle ZIPs and their JSON metadata. The output directory `bundle create` writes to by default. |
| `--cors` | `true` | Enable permissive CORS (`Access-Control-Allow-Origin: *`). Already on by default; pass `--no-cors` to disable. |
| `-h, --help` | — | Print help and exit. |

## Examples

### Default — port 3000, serving `./update-bundles`

```bash
npx native-update server start
```

You will see:

```
🚀 Starting development update server...
✅ Server running at http://localhost:3000

Endpoints:
  GET  /api/latest?channel=production - Get latest bundle
  GET  /api/bundles - List all bundles
  GET  /bundles/<filename> - Download bundle
  GET  /health - Health check

Configure your app to use this server:
  serverUrl: 'http://localhost:3000'

Press Ctrl+C to stop
```

### Custom port and bundle directory

```bash
npx native-update server start --port 8765 --dir ./releases
```

### End-to-end local smoke test

```bash
# Terminal 1: build, bundle, and serve
yarn build
npx native-update bundle create ./dist --version 1.0.0 --channel production
npx native-update server start

# Terminal 2: point your app at http://localhost:3000 and run sync()
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/latest?channel=<channel>` | Returns the newest bundle's metadata for the given channel. `channel` defaults to `production`. Adds a `downloadUrl` field pointing at `/bundles/<filename>` on the same host. **404** if no bundle is found for the channel. |
| `GET` | `/api/bundles` | Returns `{ "bundles": ["bundle-…zip", "bundle-…zip"] }` — the list of `.zip` files in the bundle directory. |
| `GET` | `/bundles/<filename>` | Serves the raw bundle ZIP for download. Uses `express.static` — no signature checking, no auth. |
| `GET` | `/health` | Returns `{ "status": "ok", "server": "native-update-dev" }`. |

### `/api/latest` response shape

```json
{
  "version": "1.2.0",
  "channel": "production",
  "created": "2026-05-11T12:34:56.000Z",
  "platform": "web",
  "checksum": "5f3a…b8d1",
  "size": 1843921,
  "filename": "bundle-1.2.0-1715450096000.zip",
  "downloadUrl": "http://localhost:3000/bundles/bundle-1.2.0-1715450096000.zip"
}
```

The shape matches the JSON metadata files `bundle create` produces. The `downloadUrl` is added at request time.

## Configuring the SDK to use this server

In your `native-update.config.js`:

```js
export default {
  appId: 'com.example.app',
  serverUrl: 'http://localhost:3000',
  channel: 'production',
  // …
};
```

**Caveat:** mobile devices on the same Wi-Fi network as your machine cannot reach `localhost` — that resolves to the device itself. Use your machine's LAN IP (`http://192.168.x.x:3000`) instead, or expose the port via a tunnel like `ngrok`. iOS Simulator and Android Emulator have their own host-machine aliases (`localhost` on iOS Simulator works; Android Emulator uses `10.0.2.2`).

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `Error: listen EADDRINUSE: address already in use :::3000` | Port 3000 is taken. | Pass `--port <free port>` or stop the conflicting service. |
| `Error: ENOENT, no such file or directory '<dir>'` (on first request) | `--dir` does not exist. | `bundle create` first, or point at the actual bundle output dir. |
| `404 {"error":"No bundles found"}` (from a client) | No metadata JSON in `--dir` has the requested channel. | Bundle with `--channel <channel>` matching the SDK's configured channel. |

## What the dev server does NOT do

- **No signature verification.** It serves whatever ZIP is in the bundle directory. The device-side SDK still verifies the signature (your `.sig` sidecar) — but this server does not enforce it.
- **No auth.** Anyone on your network can hit `http://<your-ip>:3000`. Do not expose this beyond a trusted LAN.
- **No rate limiting.** Trivially flood-able.
- **No rollouts.** Always serves the newest bundle for the channel. Use the Laravel backend or hosted SaaS for staged rollouts.
- **No analytics.** Use [`monitor`](./monitor) against a real backend if you need download stats.
- **No HTTPS.** Plain HTTP. For HTTPS-required testing (iOS App Transport Security, etc.), terminate TLS at a reverse proxy (`mkcert` + `caddy` is the easiest path).
- **No persistence beyond files on disk.** Restarting wipes nothing; deleting the bundle directory wipes everything.

## Stopping the server

`Ctrl+C` — Express handles `SIGINT` cleanly. The CLI itself does not install custom signal handlers for this command (unlike `monitor`).

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
