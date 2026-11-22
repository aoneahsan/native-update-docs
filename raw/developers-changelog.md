# Developer changelog

**Changes to the developer surfaces, newest first.** Plugin and SDK releases have their own [changelog](/changelog).

## 2026-11-22 {#2026-11-22}

- A recovery code now trusts its own sign-in only. It opens the dashboard and **Move to a new phone**; showing a secret, making new recovery codes and the admin area need a code from the authenticator app.
- A webhook send that fails in an unexpected way is now recorded on the delivery with its reason and retried on the usual schedule, instead of staying at zero attempts.
- A refused MCP authorization now names the OAuth error on the consent page.

## 2026-11-21 {#2026-11-21}

- **MCP server** at `https://nativeupdatebe.aoneahsan.com/mcp` for Claude, ChatGPT, Claude Code and Cursor: OAuth 2.1 with PKCE `S256`, Dynamic Client Registration, a consent page in the dashboard with nine permissions of Native Update's own, and deletes that wait for your yes. [AI apps](/developers/assistants).
- **Webhooks** with Standard Webhooks signing, twelve events across builds, apps and app keys, retries, pause, a delivery log and addresses checked against private networks. [Webhooks](/developers/webhooks).
- **Two-step sign-in** for every account: an authenticator app, ten recovery codes and an opt-in 7-day remembered browser, in the dashboard and in Nova. [Two-step sign-in](/developers/two-step-sign-in).
- **The 10-minute rule** for every secret: a token, an app key or a webhook signing secret is shown again only within 10 minutes of a sign-in, with a code when two-step sign-in is on. [Access tokens](/developers/access-tokens#ten-minute-rule).
- **OpenAPI 3.1** document for the Public Management API, generated from the backend's routes: [`openapi.json`](https://nativeupdatebe.aoneahsan.com/api/public/v1/openapi.json). [The API](/developers/api).
- **Plan limits** for access tokens, API requests a day, webhook addresses and AI connections, shown in the Developer area.
