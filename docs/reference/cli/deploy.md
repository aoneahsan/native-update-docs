---
sidebar_position: 10
title: CLI — deploy & remote commands
description: Deploy a bundle from CI or your terminal with an access token — deploy, apps list, builds list/promote/rollout/status/delete, jobs status, and token info.
keywords: [native-update deploy, ota ci deploy, native-update cli access token, promote build cli, rollout cli]
last_update:
  date: 2026-07-16
  author: Ahsan Mahmood
---

# `deploy` and the remote commands

These commands talk to the [public management API](/public-api/overview) with an
access token, so you can ship a release from CI or your terminal.

They are distinct from `bundle create` / `bundle sign`, which work on local
files and need no token.

## Authenticate

Create a token in the dashboard → **Access Tokens**, then:

```bash
export NATIVE_UPDATE_TOKEN=nu_pat_…
```

Prefer the environment variable over `--token`: a flag lands in shell history
and in the process list, where CI logs can pick it up.

| Setting | Env | Flag | Default |
|---|---|---|---|
| Token | `NATIVE_UPDATE_TOKEN` | `-t, --token` | — (required) |
| Backend | `NATIVE_UPDATE_SERVER` | `-s, --server` | `https://nativeupdatebe.aoneahsan.com` |

Set `NATIVE_UPDATE_SERVER` only when self-hosting.

## `deploy`

```bash
npx native-update deploy <webDirOrZip> --app <app> [options]
```

Pass a **directory** and it gets zipped for you, or pass a prebuilt `.zip`.

```bash
# The common CI case
npx native-update deploy ./dist --app com.example.app --version 1.2.0 --wait

# Staged rollout with notes
npx native-update deploy ./dist \
  --app com.example.app --version 1.2.0 \
  --channel production --rollout 10 --notes "Bug fixes"
```

| Option | Default | Notes |
|---|---|---|
| `-a, --app <app>` | required | Numeric id or `app_id` (`com.example.app`) |
| `-v, --version <v>` | `./package.json` version | Strict semver; must be newer than the channel head |
| `-c, --channel <c>` | `production` | `production` · `staging` · `development` |
| `-n, --notes <text>` | — | Release notes |
| `-r, --rollout <n>` | 100 | Initial rollout percentage |
| `--min-native <v>` | — | Minimum native app version |
| `-w, --wait` | off | Block until the release is live |

### Always use `--wait` in CI

Uploads are queued, so without `--wait` the command exits as soon as the bundle
is *accepted* — a failed release would look like a green build. With `--wait` it
polls the job and exits **1** if processing fails.

```yaml
# .github/workflows/release.yml
- run: yarn build
- run: npx native-update deploy ./dist --app com.example.app --wait
  env:
    NATIVE_UPDATE_TOKEN: ${{ secrets.NATIVE_UPDATE_TOKEN }}
```

## `token info`

Who am I, and which apps can I manage? Run this first when something 404s.

```bash
npx native-update token info
```

```
E2E CLI token
  Server:      https://nativeupdatebe.aoneahsan.com
  Permissions: manage
  Expires:     never

Apps this token can manage:
  ID  APP ID            NAME
  12  com.example.app   Example
```

## `apps list`

```bash
npx native-update apps list
```

Lists only the apps your token was scoped to.

## `builds`

```bash
# List (filterable)
npx native-update builds list com.example.app --channel production --status active

# Promote between channels (zero-copy)
npx native-update builds promote com.example.app 42 --to production

# Ramp a rollout
npx native-update builds rollout com.example.app 42 --percent 25

# Stop a bad release, or bring it back
npx native-update builds status com.example.app 42 --set paused
npx native-update builds status com.example.app 42 --set active

# Delete — needs a token with builds.delete, and --yes
npx native-update builds delete com.example.app 42 --yes
```

`delete` refuses without `--yes`, because deleting a build is permanent.

## `jobs status`

```bash
npx native-update jobs status 01hq2xk8… --wait
```

Poll a job from an upload. `--wait` blocks until it resolves and exits 1 on
failure. Handy when a `deploy` ran without `--wait`.

## Exit codes

| Code | Means |
|---|---|
| 0 | Success |
| 1 | The API returned an error, the job failed, or the input was refused |

Errors print the API's own `code` and `message`, which name the fix:

```
Error (TOKEN_PERMISSION_DENIED): This access token does not have the
'builds.delete' permission. Grant it in the dashboard (Access Tokens), or
use a token that has it.
```

A `404 APP_NOT_FOUND` usually means the token was not scoped to that app rather
than that the app is missing — check `token info`.
