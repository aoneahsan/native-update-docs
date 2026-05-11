---
sidebar_position: 3
title: keys generate — Generate signing key pair
description: native-update keys generate produces an RSA-2048 / RSA-4096 / EC P-256 / EC P-384 key pair for bundle signing. The private key is chmod 600; the public key goes into your app's native-update config.
keywords: [native-update keys generate, ota bundle signing keys, rsa 4096 capacitor, ec p-256 update signing, native-update private key]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `keys generate` — Generate a bundle-signing key pair

**`native-update keys generate` writes a fresh RSA or EC key pair to disk for OTA bundle signing.** The private key is used by your build pipeline (via [`bundle sign`](./bundle-sign)) to sign every release. The public key is shipped inside your app — the SDK uses it to verify every downloaded bundle before applying it.

Run this once at project setup, plus whenever you rotate keys (see the "Rotation" section below).

## Synopsis

```bash
npx native-update keys generate [options]
```

## Flags

| Flag | Default | Description |
|---|---|---|
| `-o, --output <dir>` | `./keys` | Output directory. Created if missing (recursive). |
| `-t, --type <type>` | `rsa` | Key algorithm. Accepted: `rsa`, `ec`. |
| `-s, --size <size>` | `2048` | Key size. For `rsa`: `2048` or `4096`. For `ec`: `256` (P-256) or `384` (P-384). |
| `-h, --help` | — | Print help and exit. |

## Output files

Two PEM-encoded files are written, both timestamped with a millisecond Unix epoch so multiple runs never overwrite each other:

| File | Format | Permissions | Use |
|---|---|---|---|
| `private-<timestamp>.pem` | PKCS#8 PEM | `chmod 600` (owner read/write only) | **Secret.** Sign bundles with `bundle sign --key …`. **Never commit.** |
| `public-<timestamp>.pem` | SPKI PEM | default | Public. Embed in your `native-update.config.js` and ship inside the app. |

The CLI sets `chmod 0o600` on the private key automatically. On Windows, the chmod call is a no-op — protect the file with NTFS ACLs or store it in a secret manager.

## Algorithm choice

| Choice | When to pick it | Trade-off |
|---|---|---|
| `rsa --size 4096` | **Default for production.** Strongest mainstream option. | Signatures are ~512 bytes; signing is slower than RSA-2048. |
| `rsa --size 2048` | The library default. Fine for most apps. | Slightly faster; weaker margin against future cryptanalysis than 4096. |
| `ec --size 256` | When bundle size matters and you trust ECDSA. | Signatures are ~70-72 bytes (much smaller). Library support is broader for RSA. |
| `ec --size 384` | High-security EC option. | Same trade-off as P-256, slightly slower. |

When in doubt, use `rsa --size 4096`. The signature size difference (~440 bytes per bundle) is negligible next to a multi-megabyte JS bundle, and RSA support is universal.

## Examples

### Default RSA 2048-bit key pair

```bash
npx native-update keys generate
```

Writes `./keys/private-1715450000000.pem` and `./keys/public-1715450000000.pem` (timestamp varies). The CLI prints both paths plus a security checklist.

### Production-grade RSA 4096-bit pair

```bash
npx native-update keys generate --type rsa --size 4096
```

Recommended for any production deployment. Generation takes a few seconds — be patient.

### EC P-256 pair in a custom directory

```bash
npx native-update keys generate --type ec --size 256 --output ./.secrets
```

Useful when you store secrets in a non-default folder or want to keep keys outside the default `keys/` path that `init` references.

## After generation: install the public key

The CLI prints a "Next steps" hint. The two things you must do:

```js
// native-update.config.js
export default {
  // …
  publicKey: `-----BEGIN PUBLIC KEY-----
… paste the contents of public-<timestamp>.pem here …
-----END PUBLIC KEY-----`,
};
```

…and add the private key to `.gitignore`:

```bash
echo "keys/private-*.pem" >> .gitignore
echo ".secrets/" >> .gitignore
```

Where you store the private key in production is your call — common choices: a secret manager (1Password, Doppler, AWS Secrets Manager), a CI-only environment variable, or an encrypted file decrypted in CI just before `bundle sign` runs.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `RSA key size must be 2048 or 4096` | Passed `--size 1024` or another unsupported value with `--type rsa`. | Use `2048` or `4096`. RSA-1024 is below modern security baselines. |
| `EC key size must be 256 or 384` | Passed an unsupported curve hint with `--type ec`. | Use `256` (P-256 / prime256v1) or `384` (secp384r1). |
| `Key type must be "rsa" or "ec"` | Passed something other than `rsa` / `ec` to `--type`. | Use `rsa` or `ec`. The CLI does not (currently) support Ed25519 / DSA. |
| `Failed to generate keys: EACCES …` | Output directory is not writable. | Pick a writable `--output` directory, or `chmod +w` the existing one. |

The command exits `1` on any of the above; otherwise it exits `0`.

## Rotation

**Do not panic-rotate keys on a normal schedule.** Active devices have your current public key compiled into the app — flipping the signing key invalidates every bundle they would otherwise download. Rotate keys when:

1. **The private key is leaked.** Treat the leak as a security incident: generate a new pair, ship a new app-store build with the new public key, and accept that older app-store installs cannot receive OTA updates until they update through the store.
2. **An algorithm needs upgrading.** Same constraint — older binaries cannot verify the new signature, so plan a normal app-store release alongside the rotation.

A safer rotation pattern is to ship multiple public keys and have the SDK accept any of them — file an issue if you need that and it does not exist in your `native-update` version.

## What this command does NOT do

- It does not upload the public key anywhere. You install it manually in `native-update.config.js`.
- It does not validate the keys after generation. You can run `bundle sign` + `bundle verify` end-to-end with a tiny test bundle if you want a smoke test.
- It does not encrypt the private key with a passphrase. The PKCS#8 file is unprotected — protect it at the filesystem layer.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
