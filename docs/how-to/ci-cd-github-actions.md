---
sidebar_position: 5
title: Integrate with CI/CD (GitHub Actions)
description: A production-grade GitHub Actions workflow that builds, bundles, signs, verifies, and uploads an OTA release on every push to main. Covers secret management, key handling, fan-out across channels, and the manual-approval pattern for production rollouts.
keywords: [native-update github actions, ota cicd, capacitor ota pipeline, ota release automation, native-update ci secrets]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Integrate with CI/CD (GitHub Actions)

You want every push to `main` to ship an OTA release, with the build, signing, and upload happening in CI rather than on a developer machine. This how-to walks through a complete GitHub Actions workflow plus the secret-management decisions around it.

The example uses GitHub Actions because it is the most common target, but the same shape applies to GitLab CI, CircleCI, Bitbucket Pipelines, or any runner with bash and Node.

## Prerequisites

A working OTA setup. If you haven't run through [Your first OTA update](/tutorials/first-ota-update), do that first — the rest of this guide assumes the manual flow works on your machine.

A GitHub repository with Actions enabled. Public repos get unlimited free minutes; private repos use the included free tier.

A signing keypair (`./keys/private-*.pem` + `./keys/public-*.pem`). The private key will live in GitHub Secrets, not in your repo.

A backend with a programmatic upload endpoint. The hosted SaaS, the Laravel reference backend, and the Express scaffold all expose `POST /api/v1/bundles/upload` (or equivalent) — see [API Contract](/backend/api-contract).

## Step 1 — Store the private key as a GitHub Secret

GitHub Settings → Secrets and variables → Actions → New repository secret.

| Name | Value |
|---|---|
| `NATIVE_UPDATE_PRIVATE_KEY` | Full contents of `keys/private-<timestamp>.pem` (including BEGIN/END lines). |
| `NATIVE_UPDATE_BACKEND_URL` | `https://nativeupdatebe.aoneahsan.com` (or your self-hosted URL). |
| `NATIVE_UPDATE_API_KEY` | The API key the dashboard issued for your app. |

The secret is encrypted at rest by GitHub. It is only decrypted into the runner's environment for the duration of a workflow run, and it is masked in logs (any echo of it shows `***`).

For more sensitive deployments (financial / health / compliance), consider an external secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) and fetch the key at job start. The pattern is the same — what matters is that the private key never lives in the repo.

## Step 2 — The workflow file

Create `.github/workflows/ota-release.yml`:

```yaml
name: OTA release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      channel:
        description: 'Channel to publish to'
        required: true
        default: 'production'
        type: choice
        options: [production, staging, beta]

concurrency:
  group: ota-release-${{ github.ref }}-${{ inputs.channel || 'production' }}
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --immutable

      - name: Build web app
        run: yarn build

      - name: Derive version
        id: version
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"

      - name: Create bundle
        run: |
          npx native-update bundle create ./dist \
            --version "${{ steps.version.outputs.version }}" \
            --channel "${{ inputs.channel || 'production' }}"

      - name: Materialise signing key
        run: |
          mkdir -p ./keys
          umask 077
          echo "${{ secrets.NATIVE_UPDATE_PRIVATE_KEY }}" > ./keys/private.pem

      - name: Sign bundle
        run: |
          npx native-update bundle sign \
            ./update-bundles/bundle-*.zip \
            --key ./keys/private.pem

      - name: Verify signature (release gate)
        run: |
          npx native-update bundle verify \
            ./update-bundles/bundle-*.signed.zip \
            --key ./public.pem || (echo "Signature verification failed" && exit 1)

      - name: Upload bundle
        env:
          BACKEND_URL: ${{ secrets.NATIVE_UPDATE_BACKEND_URL }}
          API_KEY: ${{ secrets.NATIVE_UPDATE_API_KEY }}
          VERSION: ${{ steps.version.outputs.version }}
          CHANNEL: ${{ inputs.channel || 'production' }}
        run: |
          BUNDLE=$(ls ./update-bundles/bundle-*.signed.zip | head -1)
          SIG=$(ls ./update-bundles/bundle-*.signed.sig | head -1)
          curl -fSL -X POST "$BACKEND_URL/api/v1/bundles/upload" \
            -H "X-API-Key: $API_KEY" \
            -F "bundle=@$BUNDLE" \
            -F "signature=@$SIG" \
            -F "version=$VERSION" \
            -F "channel=$CHANNEL"

      - name: Cleanup
        if: always()
        run: rm -f ./keys/private.pem
```

A few details worth understanding before you run this:

The `concurrency` block prevents two releases from racing. If you push twice in quick succession, the second run waits for the first to finish (rather than `cancel-in-progress: true`, which would abandon it). For OTA releases, "let the in-flight upload finish" is the right policy.

The `umask 077` before writing the private key ensures the file lands at mode `600` — owner-read only. Even though the runner is ephemeral, defensive habits at the runner layer matter when you copy this pattern to a shared CI host.

The "Verify signature" step is the release gate. If your `public.pem` (checked into the repo) doesn't match the private key in `secrets`, the verify step fails and the upload never runs. This catches the most common silent failure mode — key drift between repo and secret manager.

The `Cleanup` step with `if: always()` runs even if a prior step failed, so the private key never persists on the runner past the job (which is anyway destroyed when the run completes, but the explicit cleanup is documentation of intent).

## Step 3 — Verify the workflow

Push a trivial commit to `main` and watch Actions. The expected timeline on a small Capacitor app:

| Step | Time |
|---|---|
| Checkout + Node setup | ~10 s |
| `yarn install` | ~30-90 s (cached) |
| `yarn build` | ~20-60 s (depends on app) |
| Bundle + sign + verify | ~5 s |
| Upload | ~5-30 s (depends on backend) |
| **Total** | ~1-3 minutes |

If the verify step fails with `INVALID`, the private key in your GitHub Secret does not match the public key your dashboard is configured with. Re-generate the keypair locally, copy the new private key to GitHub Secrets, re-upload the new public key to the dashboard.

## Step 4 — Add a manual approval for production

Going to production on every push to `main` is risky. The safer pattern uses GitHub Environments:

Settings → Environments → New environment → name it `production`. Add a "Required reviewer" rule with yourself or your release manager. The workflow then waits for explicit approval before deploying:

```yaml
jobs:
  release:
    environment: ${{ inputs.channel || 'production' }}
    # ... rest of the job
```

With the `production` environment set up as protected, the `release` job pauses at the start of its run and pings the reviewers. A reviewer clicks "Approve and deploy"; the job continues.

For `staging` / `beta`, you can either omit the protection (auto-deploy) or add a softer rule (any team member can approve).

## Step 5 — Cache wisdom and gotchas

A few things that catch people:

**Don't cache the `update-bundles/` directory.** The bundle filename includes a timestamp, so a cached bundle from a previous run is just stale junk. The build is fast enough that re-building is the simpler answer.

**Don't run the workflow on tags AND branches both targeting the same channel.** Pick one trigger pattern — e.g. branches for staging, tags for production — to avoid double-publishing.

**Set `fetch-depth: 0` if you read git history during the build.** Some changelog-generation tools need full history. The default checkout is shallow.

**Use `npm publish --provenance` if you also publish an npm package.** GitHub Actions supports OIDC-signed provenance attestations for npm, which the `native-update` repo's own release workflow demonstrates.

## What this workflow does NOT include

**Tests.** Add `yarn test` before the build step. If tests fail, the workflow aborts before bundling.

**Versioning.** This example reads the version from `package.json`. If you use `git tag`-driven versioning, change the version-derive step to `git describe --tags`.

**Notification.** No Slack / Discord post on success or failure. Add a final step with `slackapi/slack-github-action@v1` or your team's notification choice.

**Rollback automation.** The workflow uploads; rollback is a human dashboard click (or a separate workflow that POSTs to your backend's rollback endpoint). See [Roll back a bad bundle](./roll-back-bundle).

## Related

- [CLI Reference → bundle create / sign / verify](/reference/cli/bundle-create) — what each step actually does.
- [Rotate signing keys without breaking active bundles](./rotate-signing-keys) — the rotation flow during CI key updates.
- [API Contract → /api/v1/bundles/upload](/backend/api-contract) — the upload endpoint shape.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
