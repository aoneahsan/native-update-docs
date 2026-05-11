---
sidebar_position: 5
title: bundle sign — Sign an OTA bundle with your private key
description: native-update bundle sign produces an RSA-SHA256 signature of an OTA bundle and writes a sidecar .sig JSON file. The signed bundle and signature both upload to your backend; the device-side SDK verifies before applying.
keywords: [native-update bundle sign, rsa sha256 ota signing, capacitor bundle signature, native-update sig sidecar]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `bundle sign` — Sign a bundle with your private key

**`native-update bundle sign <bundlePath> --key <private-key>` produces an RSA-SHA256 signature over a bundle ZIP and writes the signature to a sidecar `.sig` JSON file.** This is the second step of a release (after `bundle create`) and the security guarantee the device-side SDK relies on — a bundle whose signature does not verify against your shipped public key is rejected on the device.

The command operates entirely on local files and does **no network I/O**.

## Synopsis

```bash
npx native-update bundle sign <bundlePath> --key <privateKey> [options]

# Alias:
npx native-update bundle sign-bundle <bundlePath> --key <privateKey> [options]
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<bundlePath>` | Yes | Path to the bundle ZIP produced by `bundle create`. |

## Flags

| Flag | Required | Default | Description |
|---|---|---|---|
| `-k, --key <path>` | **Yes** | — | Path to a PEM-encoded **private** key (PKCS#8 — the format `keys generate` writes). |
| `-o, --output <path>` | No | `<bundlePath>` with `.zip` replaced by `.signed.zip` | Output path for the signed bundle. The `.sig` sidecar lands next to it. |
| `-h, --help` | — | — | Print help and exit. |

## Examples

### Sign with a private key in the default location

```bash
npx native-update bundle sign \
  ./update-bundles/bundle-1.2.0-1715450096000.zip \
  --key ./keys/private-1715000000000.pem
```

Writes:

- `./update-bundles/bundle-1.2.0-1715450096000.signed.zip` (copy of the input bundle — content-identical)
- `./update-bundles/bundle-1.2.0-1715450096000.signed.sig` (JSON signature sidecar)

### Sign with a custom output path

```bash
npx native-update bundle sign ./bundle.zip \
  --key ./keys/private.pem \
  --output ./releases/bundle-v1.2.0.zip
```

Writes `./releases/bundle-v1.2.0.zip` and `./releases/bundle-v1.2.0.sig`.

### Sign in CI

```bash
# Assume the private key was placed at ./keys/ci-private.pem by a secret-decryption step
yarn build
npx native-update bundle create ./dist --version "$RELEASE_VERSION" --channel production
npx native-update bundle sign ./update-bundles/bundle-*-*.zip --key ./keys/ci-private.pem
```

## What the signature sidecar contains

The `.sig` file is plain JSON, written next to the (signed-copy) bundle:

```json
{
  "originalBundle": "bundle-1.2.0-1715450096000.zip",
  "signature": "Base64SignatureBytesHere==",
  "signedAt": "2026-05-11T12:35:40.000Z",
  "algorithm": "RSA-SHA256"
}
```

The signature is RSA-SHA256 over the raw bytes of the bundle ZIP, base64-encoded. The device-side SDK reads the same sidecar, re-hashes the downloaded ZIP, and verifies the signature using the public key compiled into the app.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `Failed to sign bundle: ENOENT, no such file or directory '<bundlePath>'` | Bundle path is wrong or the bundle has not been created yet. | Run `bundle create` first; copy/paste the exact path from its success output. |
| `Failed to sign bundle: ENOENT, no such file or directory '<keyPath>'` | The path passed to `--key` does not exist. | Run `keys generate` first, or fix the `--key` path. |
| `Failed to sign bundle: error:0909006C:PEM routines:get_name:no start line` | The file at `--key` is not PEM — wrong file, binary key, or PKCS#1 vs PKCS#8 mismatch. | Use a private key produced by `keys generate` (PKCS#8 PEM). |
| `Failed to sign bundle: error:0480006A:asn1 encoding routines::nested asn1 error` | Truncated or corrupted private key file. | Re-export the key, or restore from your secret store. |
| `Failed to sign bundle: <other>` | OS-level failure (permission denied, disk full, etc.). | Investigate the underlying message; fix permissions or free space. |

Exit code is `1` on any of the above; `0` on success.

## What the command prints on success

```
🔏 Signing bundle...
✅ Bundle signed successfully!

Signed Bundle:
  Bundle: /abs/path/update-bundles/bundle-1.2.0-1715450096000.signed.zip
  Signature: /abs/path/update-bundles/bundle-1.2.0-1715450096000.signed.sig

Next steps:
  1. Upload both files to your update server
  2. Update your server to serve the signature
```

## Important: ship the `.sig` alongside the bundle

Your backend must serve **both** files. The hosted Native Update SaaS handles this automatically (upload the signed ZIP and the SaaS keeps the signature record). The Laravel reference backend stores the signature in the `builds.signature` column. The minimal Node/Express scaffold expects you to wire this up — see [`backend create`](./backend-create).

If your backend serves the bundle but not the signature, the SDK rejects the bundle and reports `SIGNATURE_VERIFICATION_FAILED` — that is the failure mode by design.

## Recommended workflow

After signing, run [`bundle verify`](./bundle-verify) with the matching **public** key as a CI safety net — it catches private/public key mismatches before a bad pair ever reaches a device:

```bash
npx native-update bundle sign ./bundle.zip --key ./keys/private.pem
npx native-update bundle verify ./bundle.signed.zip --key ./keys/public.pem
# If verify exits 0, you are safe to upload.
```

## Notes and limitations

- **Algorithm is fixed.** `RSA-SHA256` is the only supported algorithm in v3.x. EC signing is not yet wired through `bundle sign` — open an issue if you need it.
- **Bundle content is unchanged.** The signed ZIP is a byte-for-byte copy of the input (or the input file itself if no `--output` is passed and the names happen to match). The signature is the only new artifact.
- **Reproducibility.** Signing the same bundle twice with the same key produces the same signature (deterministic RSA-SHA256 in Node's `crypto`).

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
