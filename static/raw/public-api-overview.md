# Public Management API

Everything the dashboard does — create and configure apps, mint and rotate API
keys, manage a signing key, upload a bundle, publish it, promote it between
channels, adjust a rollout, back up a keystore — is also an HTTP API. Use it to
run an app's whole lifecycle from CI, a script, or an AI agent.

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
3. **Choose its reach.** Tick the specific apps it may manage, or turn on
   **All apps** to cover every app you own — the ones you have now *and* any you
   create later. A scoped token can reach nothing outside its list.
4. Leave the **delete** permissions (builds, apps, keys) off unless you need
   them. Everything else — read, upload, publish, promote, rollout, mint keys,
   rotate a signing key, back up a keystore — is always allowed.

Copy the token from that page whenever you need it again, or **Rotate** to issue
a new secret — rotating stops the old one immediately.

:::note Access tokens are the one thing this API cannot touch
Creating, rotating, and deleting a token stays in the dashboard, always — there
is no token-management endpoint on the public plane. A leaked token can never
mint another token or widen its own reach.
:::

## Scoping

A token reaches exactly the apps you ticked — or, when it was created with
**All apps**, every app you own, including any created later. `GET /token`
reports which, as `all_apps: true | false`.

Anything outside a scoped token's reach — another user's app, your own unticked
app, an id that never existed — answers **404**, never 403. That is deliberate:
a 403 would confirm the resource exists and turn the API into a way to discover
other people's apps. So when an app id you trust returns 404, check the token's
own list first:

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/token
```

Create an app with an explicitly-scoped token and the new app is
**auto-attached** to it, so the token that provisioned the app can manage it
straight away — no dashboard trip to grant access.

## Permissions

Every valid token can **manage**: read apps, builds, keys and the signing key;
create and edit apps; mint, rotate and restrict API keys; create and rotate a
signing key; upload, publish, promote and roll out builds; upload and download a
keystore backup. That is implied — you never grant it.

The three **delete** permissions are separate and off by default, so a leaked CI
token can ship a release but never erase history or tear an app down:

| Permission | Gates |
|---|---|
| `builds.delete` | `DELETE …/builds/{build}` |
| `apps.delete` | `DELETE …/apps/{app}` (cascades its builds and keys) |
| `keys.delete` | `DELETE …/api-keys/{key}` |

Call one of those without the matching permission and it answers
`403 TOKEN_PERMISSION_DENIED` — `details.required_permission` names the one to
grant. Finer-grained permissions (push-only, publish-only) are planned.

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
