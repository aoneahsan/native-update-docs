# Connect Claude, ChatGPT, Claude Code or Cursor

**Native Update runs an MCP server at `https://nativeupdatebe.aoneahsan.com/mcp`.** Add that one address to Claude, ChatGPT, Claude Code or Cursor, sign in to Native Update when it opens, and tick what the app may do. Then you can ask, in plain words, *"how far is Checkout app 4.2.1 rolled out?"* or *"pause the staging rollout of 4.2.2"*.

These are the AI apps you bring yourself. The release notes writer and docs assistant inside the dashboard are a different thing: [AI assistants and Speak](/dashboard/ai-assistants).

## Add the address {#add}

### Claude {#claude}

1. In Claude, open **Settings**, then **Connectors**.
2. Choose **Add custom connector**. Name it Native Update and paste the address.
3. Choose **Connect**. Native Update opens: sign in, then pick what Claude may do.
4. In a chat, turn Native Update on from the tools menu.

### ChatGPT {#chatgpt}

1. In ChatGPT, open **Settings**, then **Apps and Connectors**.
2. Under **Advanced settings**, turn on **Developer mode**.
3. Choose **Create**. Name it Native Update, paste the address and pick **OAuth**.
4. Choose **Connect**, sign in to Native Update and pick what ChatGPT may do.

### Claude Code {#claude-code}

```bash
claude mcp add --transport http native-update https://nativeupdatebe.aoneahsan.com/mcp
```

Then type `/mcp` in Claude Code, pick `native-update` and choose **Authenticate**. Your browser opens Native Update.

### Cursor {#cursor}

Add this to `~/.cursor/mcp.json`, or to `.cursor/mcp.json` in one project:

```json
{
  "mcpServers": {
    "native-update": { "url": "https://nativeupdatebe.aoneahsan.com/mcp" }
  }
}
```

Open **Cursor Settings**, then **MCP**, and choose **Connect** beside `native-update`.

## The consent page {#consent}

Every app lands on the same page in the dashboard, `nativeupdate.aoneahsan.com/oauth/consent`. It shows who is asking, where it sends you back to, and when the app registered itself. You tick what it may do, give the connection a name you will recognise, and choose **Connect**. We email you about each new connection. The request lapses after 10 minutes; start again from the AI app if it does.

| Permission | What it allows |
|---|---|
| `account:read` | Your name, plan and usage |
| `apps:read` | See your apps and their channels |
| `builds:read` | See builds, rollouts and their device numbers |
| `keys:read` | See app key names and restrictions, never the keys |
| `apps:write` | Create apps and change their settings |
| `builds:write` | Upload bundles, promote builds, widen, narrow or pause rollouts |
| `keys:write` | Restrict or revoke app keys (new keys are shown only in the dashboard) |
| `builds:delete` | Ask to delete builds |
| `apps:delete` | Ask to delete apps |

The app sees only the tools its permissions allow. A read-only connection is never offered a write tool, and a tool called without its permission answers `scope_required`.

| Tool | Needs |
|---|---|
| `whoami`, `get_confirmation` | `account:read` |
| `list_apps`, `get_app` | `apps:read` |
| `create_app`, `update_app` | `apps:write` |
| `prepare_delete_app` | `apps:delete` |
| `list_builds`, `get_build` | `builds:read` |
| `change_rollout`, `promote_build` | `builds:write` |
| `prepare_delete_build` | `builds:delete` |
| `list_keys` | `keys:read` |
| `prepare_revoke_key` | `keys:write` |

A list answers at most 50 items at a time, with a cursor for the next page. Changes are limited to 10 a minute per connection.

## What an AI app never reaches {#never}

- Billing, your plan, the team, your email or two-step sign-in.
- Access tokens, app keys, signing keys, webhook secrets and recovery codes. A new app key is shown only in the dashboard.
- Apps you reach through a team, and anyone else's account.
- A delete without your yes.

Release notes and app names reach the app as text from your account, never as instructions to it.

## Deletes wait for you {#deletes}

An AI app cannot delete anything. `prepare_delete_app`, `prepare_delete_build` and `prepare_revoke_key` only **prepare**: they answer a link, `nativeupdate.aoneahsan.com/developers/confirm/<ref>`, and a preview of what would go. Open it, check the preview, and choose yes or no. To delete an app you type its name exactly. Nobody saying yes within 10 minutes means nothing happens.

The app finds out with `get_confirmation`: `waiting`, `done`, `declined`, `expired`, or `gone` when the thing was already deleted another way. Requests still open are listed under **Waiting for your yes** on the **AI connections** page.

## Disconnect {#disconnect}

**AI connections** lists every app you connected, with what it can see, change and ask to delete. **Disconnect** ends its access at once: its next request answers `401`, its saved sign-in is cancelled, and any delete it was waiting on lapses. Connect it again any time from the steps above. A disconnected connection frees its place on your plan.

## For MCP client authors {#protocol}

- Transport: Streamable HTTP, `POST /mcp`.
- Authorization: OAuth 2.1, authorization code with PKCE (`S256` only; `plain` is refused), public clients (`token_endpoint_auth_method: none`).
- Discovery: [`/.well-known/oauth-protected-resource/mcp`](https://nativeupdatebe.aoneahsan.com/.well-known/oauth-protected-resource/mcp) names the resource and its authorization server; [`/.well-known/oauth-authorization-server`](https://nativeupdatebe.aoneahsan.com/.well-known/oauth-authorization-server) lists the endpoints. An unauthenticated call answers `401` pointing at the resource metadata.
- Dynamic Client Registration: `POST https://nativeupdatebe.aoneahsan.com/oauth/register`. Registering grants nothing until a person approves on the consent page.
- Scopes: the nine above, plus `offline_access`, which grants no tool and lets the app stay connected without asking again.
- Tokens: an access token lasts 10 minutes and a refresh token 30 days. Replaying a refresh token that was already rotated disconnects the whole connection.
