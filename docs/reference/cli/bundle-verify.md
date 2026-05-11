---
sidebar_position: 6
title: bundle verify — Verify a signed bundle with your public key
description: native-update bundle verify confirms an OTA bundle's RSA-SHA256 signature against your public key. Use it as a CI safety net before uploading — exits 1 if the signature is invalid.
keywords: [native-update bundle verify, ota signature verification, capacitor bundle integrity, native-update ci safety net]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# `bundle verify` — Verify a signed bundle with your public key

**`native-update bundle verify <bundlePath> --key <public-key>` re-verifies the RSA-SHA256 signature on a bundle the same way the device-side SDK does.** Use it as a CI safety net before uploading: if the signature is invalid, the device-side SDK will reject the bundle, so catching the failure on the build machine saves you a debugging round-trip.

The command operates entirely on local files and does **no network I/O**.

## Synopsis

```bash
npx native-update bundle verify <bundlePath> --key <publicKey>

# Alias:
npx native-update bundle verify-bundle <bundlePath> --key <publicKey>
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<bundlePath>` | Yes | Path to the bundle ZIP. The sidecar `.sig` file is read automatically from the matching path (same basename, `.sig` extension). |

## Flags

| Flag | Required | Default | Description |
|---|---|---|---|
| `-k, --key <path>` | **Yes** | — | Path to a PEM-encoded **public** key (SPKI — the format `keys generate` writes). |
| `-h, --help` | — | — | Print help and exit. |

## How the signature is located

The command looks for the signature at `<bundlePath>` with `.zip` replaced by `.sig`. For example:

| Bundle path | Expected signature path |
|---|---|
| `./bundle.zip` | `./bundle.sig` |
| `./releases/bundle-1.2.0.signed.zip` | `./releases/bundle-1.2.0.signed.sig` |

If the sidecar is missing, the command exits `1` with `No signature file found at <path>` — there is no flag to override the lookup; rename the sidecar to match the bundle.

## Examples

### Verify a freshly signed bundle

```bash
npx native-update bundle verify \
  ./update-bundles/bundle-1.2.0-1715450096000.signed.zip \
  --key ./keys/public-1715000000000.pem
```

A valid signature prints:

```
🔍 Verifying bundle signature...
✅ Bundle signature is VALID

Bundle Details:
  Signed at: 2026-05-11T12:35:40.000Z
  Algorithm: RSA-SHA256

This bundle can be trusted and deployed safely.
```

An invalid signature prints:

```
🔍 Verifying bundle signature...
❌ Bundle signature is INVALID

WARNING: This bundle may have been tampered with!
Do not deploy this bundle.
```

…and exits `1`.

### Use in a CI release gate

```bash
yarn build
npx native-update bundle create ./dist --version "$RELEASE_VERSION" --channel production
npx native-update bundle sign  ./update-bundles/bundle-*-*.zip --key ./keys/private.pem

# Safety net — fail the build if the signature does not verify
npx native-update bundle verify ./update-bundles/bundle-*-*.signed.zip --key ./keys/public.pem || exit 1

# Upload step here…
```

This catches three real-world failure modes before they reach a device:

1. Private/public key drift (signing key does not match the public key shipped in the app).
2. Bundle corruption between signing and upload (rare, but happens when a transfer step rewrites the file).
3. Signature sidecar missing or pointing at the wrong bundle.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `No signature file found at <path>` | No `.sig` sidecar next to the bundle. | Run `bundle sign` to create it, or rename your sidecar to match the bundle's basename. |
| `Failed to verify bundle: ENOENT, no such file or directory '<bundle>'` | Bundle path is wrong. | Use the exact path printed by `bundle create` / `bundle sign`. |
| `Failed to verify bundle: error:0909006C:PEM routines:get_name:no start line` | The file at `--key` is not PEM, or is a private key instead of a public key. | Pass the matching `public-*.pem` file produced by `keys generate`. |
| `Failed to verify bundle: <other>` | Filesystem / OpenSSL error. | Read the message; usually a path or permission issue. |
| `Bundle signature is INVALID` (exit 1) | The signature does not match the bundle bytes under the given public key. | Re-sign with the **matching** private key, or check whether the bundle bytes were modified after signing. |

## How verification works

1. Read `<bundlePath>` into memory as raw bytes.
2. Read `<bundlePath>.sig` and parse the JSON; pull out `signature` (base64-encoded RSA-SHA256).
3. Read `--key` as a PEM-encoded public key.
4. Run `crypto.createVerify('RSA-SHA256')` over the bundle bytes; call `.verify(publicKey, signature, 'base64')`.
5. Print the result and exit with `0` (valid) or `1` (invalid).

The device-side SDK performs the same five steps, with the bundle on the device's filesystem and the public key compiled into the app. If `bundle verify` exits `0` with your public key, the device-side SDK will accept the bundle (assuming the same public key is shipped in the app).

## Notes and limitations

- **Public key must match the signing private key.** Mismatched key pairs are by far the most common cause of `INVALID` — verify the timestamps in the filenames match (`private-X.pem` / `public-X.pem`).
- **No partial / streaming verify.** Verification reads the full bundle into memory. For a 100+ MB bundle this is fine on a build machine but worth noting.
- **No support for detached signatures over chunks.** The signature covers the whole ZIP. If you need chunked verification for very large bundles, file an issue.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
