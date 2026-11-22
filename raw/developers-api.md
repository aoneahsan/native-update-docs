# The Public Management API

**The API at `https://nativeupdatebe.aoneahsan.com/api/public/v1` does what the dashboard does to your own apps:** create and edit apps, upload a bundle, publish, promote and roll out builds, make and restrict app keys, manage the signing key and back up a keystore. Every call sends an [access token](/developers/access-tokens):

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  "https://nativeupdatebe.aoneahsan.com/api/public/v1/apps?per_page=50"
```

The full guide already lives in the Public API section, so it is not repeated here:

- [Overview](/public-api/overview): scoping, the response and error envelope, rate limits.
- [Endpoints](/public-api/endpoints): every route with a `curl` example.
- [Queued jobs](/public-api/async-jobs): why an upload answers `202`, and how to follow the job.

## The OpenAPI document {#openapi}

The backend builds an OpenAPI 3.1 document from its own route list, and a contract test fails the backend's build when a route and the document disagree. It is public and needs no token:

- [`openapi.json`](https://nativeupdatebe.aoneahsan.com/api/public/v1/openapi.json): hand it to a client generator, Postman, or an AI coding agent.
- [`openapi.md`](https://nativeupdatebe.aoneahsan.com/api/public/v1/openapi.md): the same operations as Markdown, for reading or pasting into a prompt.

Each delete operation names the opt-in permission it needs, so a script can tell before calling whether it will answer `403 TOKEN_PERMISSION_DENIED`.

## Limits {#limits}

- **Per minute:** 120 requests on every endpoint, 30 uploads an hour. Past either you get `429` with `Retry-After`.
- **Per day:** your plan's API requests a day, counted per account and reset at 00:00 UTC. The Developer area shows today's count; past the number you get `429` until the reset.

## Errors {#errors}

Every error, on every operation, is one shape. Read `code` in scripts; show `message` to a person, because it says what to do next.

```json
{ "error": { "code": "TOKEN_PERMISSION_DENIED", "message": "…", "details": { "required_permission": "apps.delete" } } }
```

The public plane sends no CORS headers, on purpose. A browser cannot call it, because a token that reaches a browser has already leaked.
