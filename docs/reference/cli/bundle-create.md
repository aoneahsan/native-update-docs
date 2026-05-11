---
sidebar_position: 4
title: bundle create — Package a web build into an OTA bundle
description: native-update bundle create packages your built web directory (./dist, ./www, etc.) into a versioned ZIP plus a JSON metadata file with SHA-256 checksum, channel, and arbitrary release notes.
keywords: [native-update bundle create, ota bundle zip, capacitor live update package, native-update sha256, ota bundle metadata]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `bundle create` — Package a web build into an OTA bundle

**`native-update bundle create <webDir>` ZIPs a built web directory (your `./dist` or `./www` folder) into a versioned `.zip` and writes a sibling `.json` metadata file with a SHA-256 checksum.** This is the first step of every release: build, bundle, sign, then upload.

The command does **no network I/O** — it operates entirely on local files. Upload happens in whatever way your backend prefers (dashboard upload, S3 / Drive push, CI pipeline).

## Synopsis

```bash
npx native-update bundle create <webDir> [options]

# Alias:
npx native-update bundle create-bundle <webDir> [options]
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<webDir>` | Yes | Path to the built web directory. Must exist, must be a directory, must contain `index.html`. Cannot be a project root (see safety check below). |

## Flags

| Flag | Default | Description |
|---|---|---|
| `-o, --output <path>` | `./update-bundles` | Directory to write the bundle ZIP and metadata JSON into. Created if missing. |
| `-v, --version <version>` | Reads `version` from the nearest `package.json`; falls back to today's date as `YYYY.MM.DD`. | Bundle version. Lands in metadata. Should be a SemVer string when possible. |
| `-c, --channel <channel>` | `production` | Release channel. Common values: `production`, `staging`, `beta`, `canary`. |
| `-m, --metadata <json>` | `{}` | Extra metadata as a JSON string. Merged into the metadata file alongside `version`, `channel`, `created`, `platform`, `checksum`, `size`, `filename`. |
| `-h, --help` | — | Print help and exit. |

## Examples

### Bundle the default build directory

```bash
npx native-update bundle create ./www
```

Writes `./update-bundles/bundle-<version>-<epoch>.zip` and `./update-bundles/bundle-<version>-<epoch>.json`.

### Specify version and channel for a staging release

```bash
npx native-update bundle create ./dist --version 1.2.0 --channel staging
```

### Attach release notes via `--metadata`

```bash
npx native-update bundle create ./www --metadata '{"releaseNotes":"Bug fixes","sha":"abc123"}'
```

Any keys you pass merge into the bundle metadata file. Reserved keys (`version`, `channel`, `created`, `platform`, `checksum`, `size`, `filename`) are overwritten by the CLI even if you pass them — pass only your own keys.

### Bundle from a CI script, with version pulled from `package.json`

```bash
yarn build
npx native-update bundle create ./dist --channel production
```

Omitting `--version` makes the CLI read the version from the project's `package.json`. If it cannot find one (very rare), it falls back to `2026.05.11`-style date as the version.

## What the bundle contains

The ZIP contains every file from `<webDir>` at the archive root (so `<webDir>/index.html` lands at `index.html` in the archive). Compression is gzip level 9 — maximum compression, slowest pack.

The sibling JSON metadata file has this shape (your `--metadata` keys merged in):

```json
{
  "version": "1.2.0",
  "channel": "staging",
  "created": "2026-05-11T12:34:56.000Z",
  "platform": "web",
  "checksum": "5f3a…b8d1",
  "size": 1843921,
  "filename": "bundle-1.2.0-1715450096000.zip"
}
```

`checksum` is SHA-256 of the ZIP file, hex-encoded. The SDK uses it during download to detect tampering and to short-circuit if the same bundle is already on disk.

## Safety: refused-bundle list

`bundle create` refuses to package a directory that contains any of these top-level entries, because shipping them to a device would leak source or secrets:

- `node_modules`
- `.git`
- `.env`, `.env.local`, `.env.production`

If you see this error, you almost certainly pointed at the project root by mistake — point at `./dist`, `./www`, or wherever your build script outputs. The check is intentional and not configurable.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `<webDir> is not a directory` | Path resolves to a file or does not exist. | Point at the build-output directory. |
| `No index.html found in <webDir>` | The directory exists but has no top-level `index.html`. | Make sure your bundler emits `index.html` at the root of the output, not inside a subfolder. |
| `Refusing to bundle: <dir> contains node_modules, .git, .env` | You pointed at a project root, not the built output. | Use `./dist` / `./www`, not `.`. |
| `Invalid JSON in --metadata: <reason>` | The string passed to `--metadata` is not valid JSON. | Wrap keys/strings in double quotes and escape inner quotes when shelling out. Try the value in a JSON validator first. |
| `Failed to create bundle: EACCES …` | Output path or web directory has restrictive permissions. | Fix permissions or pass a writable `--output`. |

Exit code is `1` on any of the above; `0` on success.

## What the command prints on success

```
🔨 Creating update bundle...
  Version: 1.2.0
  Channel: staging
  Output: /abs/path/update-bundles/bundle-1.2.0-1715450096000.zip
✅ Bundle created successfully!

Bundle Details:
  File: /abs/path/update-bundles/bundle-1.2.0-1715450096000.zip
  Size: 1.76 MB
  Checksum: 5f3a…b8d1
  Metadata: /abs/path/update-bundles/bundle-1.2.0-1715450096000.json

Next steps:
  1. Sign the bundle:
     npx native-update bundle sign /abs/path/.../bundle-1.2.0-1715450096000.zip --key ./keys/private.pem
  2. Upload to your update server
```

## Notes

- **Streaming SHA-256.** The checksum is computed by streaming the ZIP through Node's `crypto.createHash` — even 100+ MB bundles do not load fully into memory.
- **Bundle ID format.** `bundle-<version>-<epoch_ms>` — the millisecond timestamp guarantees uniqueness even if you bundle the same version twice in quick succession.
- **Reproducible builds.** Two `bundle create` runs over the same source tree will produce **different** checksums (the embedded `created` timestamp + `archiver` ordering both vary). Treat each bundle as immutable from creation onwards.
- **No deduplication.** The CLI does not check whether you already shipped this version. Your backend should reject duplicate `version` + `channel` combinations — the bundled Laravel reference backend does (see `backend/app/Http/Controllers/Api/BuildController.php`).

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
