---
sidebar_position: 1
title: CLI — Overview
description: The native-update CLI ships with the npm package and provides project bootstrap, key-pair generation, bundle creation, signing, verification, a local dev server, deployment monitoring, and backend scaffolds. Read this first.
keywords: [native-update cli, capacitor cli, ota bundle cli, native-update commands, bundle signing cli]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# CLI — Overview

**The `native-update` CLI is a Node.js command-line tool bundled with the plugin's npm package. It provides the build-time and release-time operations the runtime SDK cannot do itself: scaffolding configuration, generating signing keys, packaging web output into versioned bundles, signing and verifying bundles, running a local update server, polling a deployed backend for stats, and generating backend scaffolds.** It is the second half of the developer toolbox — the SDK runs on the device, the CLI runs on your machine and your CI.

You do not need a global install. The CLI ships in the `native-update` package's `bin` entry, so `npx native-update <command>` works as soon as `native-update` is listed in your project's `package.json`.

## When to use the CLI

| You want to… | Command | Notes |
|---|---|---|
| Scaffold a `native-update.config.js` file with prompts | [`init`](./init) | Interactive — asks for app ID, server URL, channel, auto-update |
| Generate an RSA / EC keypair for bundle signing | [`keys generate`](./keys-generate) | Writes timestamped `private-*.pem` + `public-*.pem` |
| Package `./dist` or `./www` into a signed-ready ZIP + metadata JSON | [`bundle create`](./bundle-create) | SHA-256 checksum, version + channel + arbitrary metadata |
| Sign a bundle with a private key | [`bundle sign`](./bundle-sign) | RSA-SHA256, emits a `.sig` JSON sidecar |
| Verify a signature with a public key (CI safety net) | [`bundle verify`](./bundle-verify) | Exits 1 if signature is invalid |
| Run a tiny Express server that serves bundles locally | [`server start`](./server-start) | Dev-only — for testing the device-side flow |
| Watch live deployment stats from a self-hosted backend | [`monitor`](./monitor) | Polls `/api/stats` every 5 s, terminal dashboard |
| Generate an Express / Firebase / Vercel backend scaffold | [`backend create`](./backend-create) | **Scaffold, not turn-key** — see warnings on that page |

## Installing the CLI

The CLI is part of the `native-update` npm package. You have three options:

```bash
# Recommended: invoke via npx without installing globally
npx native-update <command>

# Or install the plugin locally and run from node_modules
yarn add native-update
yarn native-update <command>

# Or install globally (less common)
npm install -g native-update
native-update <command>
```

`npx native-update --version` should print `3.0.0` (or whatever version of `native-update` your project is on).

## Global help

```bash
# Top-level help — lists every command with a short description
npx native-update --help

# Per-command help — every flag, default, and example
npx native-update bundle create --help
npx native-update keys generate --help
```

The CLI also accepts `-V` / `--version` to print the package version it shipped with.

## Quick-start workflow

The four most common commands you will run in a real project, in order:

```bash
# 1. One-time: scaffold a config and generate signing keys
npx native-update init --example
npx native-update keys generate --type rsa --size 4096

# 2. Per release: build your web app, then bundle, sign, and verify
yarn build
npx native-update bundle create ./dist --version 1.4.0 --channel production
npx native-update bundle sign  ./update-bundles/bundle-1.4.0-*.zip --key ./keys/private-*.pem
npx native-update bundle verify ./update-bundles/bundle-1.4.0-*.signed.zip --key ./keys/public-*.pem
```

After step 2, upload both the signed ZIP and the `.sig` sidecar to your backend (or push to the hosted Native Update SaaS). The device-side SDK takes over from there.

## Exit codes

Every CLI command follows the same exit-code contract — safe to wire into shell scripts and CI:

| Exit code | Meaning |
|---|---|
| `0` | Success. |
| `1` | A handled error — invalid argument, missing file, JSON parse failure, signature mismatch, server unreachable, etc. The CLI prints a red error message to `stderr` before exiting. |

The CLI never throws to a stack trace in production paths — every error path catches and emits a human-readable message before `process.exit(1)`. If you see a Node stack trace, that is a bug worth filing.

## Output conventions

- **Status lines** are printed with a coloured emoji prefix: `🔨` create, `🔏` sign, `🔍` verify, `🔑` keys, `🚀` server/init, `📊` monitor.
- **Success** ends with a green `✅` line, often followed by a "Next steps" hint.
- **Failure** ends with a red `❌` line written to `stderr`. Pipe-friendly: `<cmd> 2>error.log` will capture errors only.
- **Long-running** commands (`server start`, `monitor`) print a header, then keep running. Stop them with `Ctrl+C` — they handle `SIGINT` cleanly.

## Where bundles, keys, and configs land by default

| Artifact | Default location | Override flag |
|---|---|---|
| Generated config file | `./native-update.config.js` | (not configurable) |
| Example integration file | `./native-update-example.js` (only with `--example`) | (not configurable) |
| Signing keys (`private-<ts>.pem`, `public-<ts>.pem`) | `./keys/` | `keys generate --output <dir>` |
| Bundle ZIP + metadata JSON | `./update-bundles/` | `bundle create --output <dir>` |
| Signed bundle copy + `.sig` sidecar | Alongside the input bundle | `bundle sign --output <path>` |
| Generated backend scaffold | `./native-update-backend/` | `backend create --output <dir>` |

You can rename or move any of these — the device-side SDK does not care where the bundle lived on your build machine, only what URL serves it.

## What the CLI does NOT do

This is the most-asked support question, so it lives in the overview:

- **It does not upload bundles for you.** The CLI produces a ZIP + `.sig` + metadata JSON. Your backend or release pipeline uploads them. The hosted SaaS uses the dashboard or a separate upload script.
- **It does not call the device-side SDK.** Methods like `NativeUpdate.sync()` only exist on a real device or browser; the CLI runs on Node.
- **It does not edit your `AndroidManifest.xml` or `Info.plist`.** Platform setup is documented in the Platform Guides (Batch 7) — `init` only writes the JS-side config.
- **The `backend create` scaffolds are not production-ready.** They are starting points with `TODO[SCAFFOLD-IMPLEMENT-BEFORE-DEPLOY]` markers — see the [`backend create`](./backend-create) page.

## FAQ

### Do I need the CLI installed globally?

No. `npx native-update` resolves the CLI from your project's `node_modules` once `native-update` is a dependency. Globally installing it is fine but offers no functional benefit and risks version drift between projects.

### Can I run two of these in parallel?

Yes for the read-only ones (`bundle verify`, `monitor`). No for ones that write to the same output directory at the same time (`bundle create`, `keys generate`) — they share filename-by-timestamp naming, which collides on millisecond ties.

### Will the CLI ever phone home?

The CLI has no telemetry, no analytics, and no auto-update check. The only outbound network calls are the ones you explicitly make — `monitor --server <url>` polls the URL you provide, and `bundle create` does no network I/O at all.

### What Node version do I need?

Node 18 or higher, matching the plugin's `engines.node` field. The CLI uses ESM and `fetch`, so older versions will fail at parse time.

### Where is the source code?

The CLI lives in the `cli/` directory of the [`native-update` repository](https://www.npmjs.com/package/native-update). Each command is a single `cli/commands/*.js` file plus a `commander`-based dispatcher in `cli/index.js`.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
