---
sidebar_position: 8
title: monitor — Watch live deployment stats
description: native-update monitor polls a self-hosted backend's /api/stats endpoint every 5 seconds and renders a terminal dashboard with current version, channel, download totals, and recent activity. Useful for tracking a rollout in real time.
keywords: [native-update monitor, ota deployment dashboard, capacitor update stats cli, native-update terminal dashboard]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `monitor` — Watch live deployment stats from your terminal

**`native-update monitor` polls your backend's `/api/stats` endpoint every 5 seconds and renders a small terminal dashboard showing the current version, channel, total / today downloads, active installs, and recent activity.** Useful for keeping an eye on a rollout in real time without opening a browser.

The command is read-only and side-effect-free — it makes HTTP `GET` requests, prints to your terminal, and exits cleanly on `Ctrl+C`.

## Synopsis

```bash
npx native-update monitor --server <url> [options]
```

## Flags

| Flag | Required | Default | Description |
|---|---|---|---|
| `-s, --server <url>` | **Yes** | — | Backend base URL. The command appends `/api/stats` and polls every 5 seconds. |
| `-k, --key <key>` | No | — | API key. Sent as `Authorization: Bearer <key>`. Required if your backend protects `/api/stats`. |
| `-h, --help` | — | — | Print help and exit. |

## Examples

### Monitor a local dev server

```bash
npx native-update monitor --server http://localhost:3000
```

(Note: the dev server shipped with `native-update server start` does **not** implement `/api/stats` — `monitor` is intended for real backends. The hosted SaaS, the Laravel reference backend, and any production deployment of `native-update` should expose this endpoint.)

### Monitor a production backend with auth

```bash
npx native-update monitor \
  --server https://updates.example.com \
  --key "$NATIVE_UPDATE_API_KEY"
```

The `Authorization: Bearer …` header is only sent when `--key` is passed.

## What the dashboard looks like

The terminal clears on each successful tick and prints something like:

```
📊 Update Monitor - 14:35:22
──────────────────────────────────────────────────

Current Version:
  Latest: 1.4.0
  Channel: production

Download Statistics:
  Total Downloads: 12,847
  Downloads Today: 1,203
  Active Installs: 9,512

Recent Activity:
  14:35:18 - downloaded (1.4.0)
  14:34:55 - applied (1.4.0)
  14:34:30 - rolled-back (1.3.9 -> 1.3.8)

Press Ctrl+C to stop
⠋ Updating...
```

Numbers, channel, and activity are whatever your backend returns from `/api/stats`.

## Expected `/api/stats` response shape

The CLI is permissive — every field is optional. Missing fields show as `N/A` or `0`. Pass back JSON shaped like this:

```json
{
  "latestVersion": "1.4.0",
  "channel": "production",
  "totalDownloads": 12847,
  "downloadsToday": 1203,
  "activeInstalls": 9512,
  "recentActivity": [
    { "time": "14:35:18", "action": "downloaded",  "version": "1.4.0" },
    { "time": "14:34:55", "action": "applied",     "version": "1.4.0" },
    { "time": "14:34:30", "action": "rolled-back", "version": "1.3.9 -> 1.3.8" }
  ]
}
```

The hosted Native Update SaaS, the Laravel reference backend (`backend/`), and any production deployment of `native-update` should implement this contract.

## Polling, retries, and failure handling

- **Poll interval:** 5 seconds (5000 ms). Not configurable today.
- **First tick is immediate** — the dashboard appears within ~1 second on a healthy server.
- **Failure tolerance:** 5 consecutive failures before the command gives up. Failures show as `Failed to fetch stats (N/5): <reason>`.
- **Bail-out:** After 5 consecutive failures the CLI prints `Giving up after 5 consecutive failures.` and exits `1`. Reset the count by getting any successful response (network blip recoverable).
- **Signal handling:** `SIGINT` (Ctrl+C) and `SIGTERM` are caught and the CLI shuts the spinner + interval down cleanly before exiting `0`.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `Error: --server URL is required` | Forgot `--server`. | Pass it: `--server https://your-backend.example.com`. |
| `Failed to fetch stats (N/5): fetch failed` | Network error, DNS failure, server unreachable, TLS handshake failed. | Check the URL is correct and reachable; `curl` the same URL from the same machine to isolate. |
| `Failed to fetch stats (N/5): Server returned 401` | Backend requires auth and `--key` is missing or invalid. | Pass `--key <api-key>`; check the backend's API-key format. |
| `Failed to fetch stats (N/5): Server returned 404` | The backend does not expose `/api/stats`. | Either implement the endpoint or skip `monitor` for that backend. |
| `Failed to fetch stats (N/5): Server returned 500` | Backend error. | Look at the backend logs. |
| `Giving up after 5 consecutive failures.` | 5 fails in a row, no successful response. | Fix the underlying issue and re-run `monitor`. |

## Notes and limitations

- **Polling, not streaming.** The CLI polls every 5 s; it does not subscribe to webhooks or SSE. Stats are at most 5 seconds stale.
- **Single endpoint.** The CLI fetches `/api/stats` only. There is no flag to override the path.
- **No filtering.** Want stats for a specific channel? The backend has to implement the filter (e.g. `/api/stats?channel=staging`) and you would need to either run two `monitor` instances or change your backend. We will accept a `--channel` flag patch if you want to send one.
- **No colour-blind mode.** The dashboard uses `chalk` with default colour assumptions. Set `NO_COLOR=1` to strip colours entirely.
- **No headless mode.** Stats render with `console.clear()` between ticks — fine for an interactive terminal, not great for log aggregation. For log shipping, hit `/api/stats` with `curl` on a cron instead.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
