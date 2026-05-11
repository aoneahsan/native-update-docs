---
sidebar_position: 2
title: init — Scaffold native-update config
description: native-update init scaffolds a native-update.config.js file by prompting for app ID, server URL, default channel, and auto-update. Optional --example flag writes a working integration snippet.
keywords: [native-update init, capacitor ota config, native-update.config.js, native-update setup]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `init` — Scaffold native-update config

**`native-update init` is an interactive bootstrap command. It asks four questions, writes a `native-update.config.js` file, and (with `--example`) drops a ready-to-import integration snippet next to it.** Run it once per project, right after installing the plugin.

## Synopsis

```bash
npx native-update init [options]
```

## Flags

| Flag | Default | Description |
|---|---|---|
| `--example` | `false` | Also create `native-update-example.js` with a working `NativeUpdate.checkForUpdate() / downloadUpdate() / installOnNextRestart()` snippet. |
| `--backend <type>` | `custom` | Hint for the "Next steps" prompt at the end. Accepted: `custom`, `express`, `firebase`. When not `custom`, the CLI suggests running `backend create <type>` next. |
| `-h, --help` | — | Print help and exit. |

## Interactive prompts

The command always prompts for these four values — there is no non-interactive mode today. Use `--example` to also write a starter integration file.

| Prompt | Type | Validation / default | Notes |
|---|---|---|---|
| **App ID** | text | Required, non-empty | Conventionally a reverse-DNS string like `com.example.app`. Lands in `config.appId`. |
| **Update server URL** | text | Defaults to `https://your-update-server.com` | Lands in `config.serverUrl`. Replace with your real backend before shipping. |
| **Default update channel** | select | `production` / `staging` / `development` | Lands in `config.channel`. The channel the device will sync against by default. |
| **Enable automatic updates?** | confirm | Default `true` | Lands in `config.autoUpdate`. Controls whether the SDK runs `sync()` automatically on app start. |

## Examples

### Basic initialisation

```bash
npx native-update init
```

You will be prompted for the four values above, and the command will write `./native-update.config.js`. If a config file already exists, the CLI prompts before overwriting — pass `--example` here too if you want the integration snippet alongside the rewritten config.

### Initialise with the example integration

```bash
npx native-update init --example
```

Writes both `native-update.config.js` and `native-update-example.js`. The example file shows the canonical sequence: configure → check → download → install on next restart.

### Initialise targeting an Express backend

```bash
npx native-update init --backend express --example
```

Identical to `init --example` except the "Next steps" hint at the end suggests running `npx native-update backend create express`. `--backend` only changes the hint; it does not generate the backend itself.

## What the config file looks like

A successful `init` run writes `native-update.config.js` like this (values substituted from your prompt answers):

```js
export default {
  appId: 'com.example.app',
  serverUrl: 'https://your-update-server.com',
  channel: 'production',
  autoUpdate: true,

  // Security
  publicKey: `-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`,

  // Update behavior
  updateStrategy: 'immediate', // immediate, on-app-start, on-app-resume
  checkInterval: 60 * 60 * 1000, // 1 hour

  onUpdateAvailable: (update) => { console.log('Update available:', update.version); },
  onUpdateDownloaded: (update) => { console.log('Update downloaded:', update.version); },
  onUpdateFailed: (error) => { console.error('Update failed:', error); },
};
```

The `publicKey` field is intentionally left as a placeholder — you fill it in after running `keys generate`.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `Initialization cancelled.` | You answered `No` when prompted to overwrite an existing `native-update.config.js`. | Re-run `init` and answer `Yes`, or delete the existing file first. |
| `Initialization failed: <message>` | Filesystem write failed (permission denied, read-only mount, disk full). | Run from a writable directory. Check `ls -l` on the current working directory. |

## What to do next

```bash
# 1. Generate your signing keypair (writes ./keys/private-*.pem + public-*.pem)
npx native-update keys generate --type rsa --size 4096

# 2. Paste the public key contents into native-update.config.js
# 3. Import the config wherever you boot the plugin in your app
```

If you passed `--backend express` (or `firebase` / `vercel`), the CLI will also suggest running `npx native-update backend create <type>` — see the [backend create](./backend-create) page first, since the scaffolds are starting points, not production-ready services.

## Notes and limitations

- `init` is **interactive only** today. There is no `--app-id` / `--server-url` / `--channel` flag — automation pipelines should write `native-update.config.js` directly rather than scripting around the prompts.
- The generated config uses ESM (`export default { … }`). If your project is CommonJS, convert the export accordingly or move the file under a `"type": "module"` package.
- `init` does **not** edit `AndroidManifest.xml`, `Info.plist`, or `capacitor.config.ts`. Platform setup is documented in the Platform Guides.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
