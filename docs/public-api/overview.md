---
sidebar_position: 1
title: Public API — Overview
description: Manage your apps, builds, and releases over HTTP with a personal access token. Deploy from CI, a script, or an AI agent — the same things the dashboard does.
keywords: [native-update public api, access token, ota deploy api, ci deploy capacitor, native update rest api]
last_update:
  date: 2026-07-16
  author: Ahsan Mahmood
---

# Public Management API

Everything the dashboard does — list apps, upload a bundle, publish it, promote
it between channels, adjust a rollout — is also an HTTP API. Use it to deploy
from CI, a script, or an AI agent.

**Base URL:** `https://nativeupdatebe.aoneahsan.com/api/public/v1`

## Access tokens vs app API keys

The platform has two token families. They authenticate different things and are
not interchangeable.

| | App API key | Access token |
|---|---|---|
| Looks like | `nu_app_…` | `nu_pat_…` |
| Belongs to | One app | You |
| Used by | The plugin inside your app | You, CI, scripts, agents |
| Plane | `/api/v1/updates/check` | `/api/public/v1/*` |
| Can be locked to a client | Yes — [origin / package / bundle restrictions](/backend/api-contract) | No |
| Safe to ship in an app or a browser | Yes, once restricted | **Never** |

An access token carries no origin restrictions, so anyone holding it can manage
the apps it is scoped to. Keep it in a CI secret or a server environment
variable. Never commit it, and never send it from a browser.

:::warning The public plane sends no CORS headers, deliberately
Browsers cannot call `/api/public/v1` cross-origin. That is the point: a token
that reaches a browser has already leaked. Call this API from a server, a CLI,
or CI.
:::

## Create a token

1. Open the dashboard → **Access Tokens** → **New token**.
2. Name it after where it will live (`GitHub Actions — mobile app`).
3. **Tick the apps it may manage.** It can reach nothing else.
4. Leave **Allow deleting builds** off unless you need it.

Copy the token from that page whenever you need it again, or **Rotate** to issue
a new secret — rotating stops the old one immediately.

## Scoping

A token reaches exactly the apps you ticked. Anything else — another user's app,
your own unticked app, an id that never existed — answers **404**, never 403.

That is deliberate. A 403 would confirm the resource exists and turn the API
into a way to discover other people's apps. So when an app id you trust returns
404, check the token's own list first:

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/token
```

## Permissions

Every valid token can **manage**: read apps and builds, upload, publish,
promote, and adjust rollout. That is implied — you never grant it.

**`builds.delete`** is separate and off by default. Leave it off for CI tokens:
a leaked deploy token can then ship a release, but never erase your history.
Without it, `DELETE` answers `403 TOKEN_PERMISSION_DENIED`.

Finer-grained permissions (push-only, publish-only) are planned. Today the split
is `manage` plus the optional `builds.delete`.

## Response shape

Success returns a `data` envelope. Lists add Laravel's `meta` and `links`:

```json
{ "data": [ { "id": 12, "app_id": "com.example.app", "name": "Example" } ],
  "meta": { "current_page": 1, "per_page": 20, "total": 1 } }
```

Lists return 20 items per page; `?per_page=` accepts up to 50.

Errors always use one envelope:

```json
{ "error": { "code": "APP_NOT_FOUND", "message": "…", "details": { } } }
```

Read `code` in scripts, show `message` to a human — it explains the fix.

## Rate limits

| Scope | Limit |
|---|---|
| Every endpoint | 120 requests per minute |
| Uploads | 30 per hour |

Exceeding either returns **429** with a `Retry-After` header.

## Next

- [Endpoints](/public-api/endpoints) — every route, with curl examples
- [Queued jobs](/public-api/async-jobs) — why uploads return 202, and how to poll
- [OpenAPI spec](https://nativeupdate-docs.aoneahsan.com/openapi/public-api.json) — machine-readable
- [AI integration guide](/ai-integration) — condensed reference for coding agents
