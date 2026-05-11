---
sidebar_position: 4
title: Migrate from CodePush
description: A practical migration guide from Microsoft CodePush (App Center) to native-update. Maps CodePush concepts to native-update equivalents, covers running both side-by-side during the transition, and lists the gotchas that bite real migrations.
keywords: [codepush migration, native-update vs codepush, app center retirement migration, capacitor codepush alternative, react-native-code-push migration]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# How-to: Migrate from CodePush

Microsoft retired App Center on March 31, 2025. If you were running CodePush in production, you have already needed to switch — this how-to walks through replacing it with `native-update`. The migration is mostly mechanical (rename API calls, point at a new backend) plus one structural difference around bundle signing that you should understand before starting.

## When this guide applies

You have a Capacitor or Cordova app running CodePush via `cordova-plugin-code-push` or one of the Capacitor wrappers, and you want to keep OTA updates working with minimum disruption. React Native users on `react-native-code-push` need a different migration story since the bundle format differs — but the conceptual mapping below still helps.

This guide does NOT apply if you were running CodePush primarily for its analytics or staging-deployment features — those map to `native-update`'s built-in equivalents but the migration would benefit from a deeper read of the backend / channels how-tos.

## Concept mapping

| CodePush concept | `native-update` equivalent |
|---|---|
| Deployment (`Staging` / `Production`) | Channel (`staging` / `production`). |
| Deployment key | API key (one per app, scoped to all channels). |
| `codePush.sync()` | `NativeUpdate.sync()`. |
| `codePush.notifyApplicationReady()` | `NativeUpdate.notifyAppReady()`. |
| `codePush.allowRestart()` / `disallowRestart()` | Not currently exposed — see [SDK Reference → Core](/reference/sdk/core/lifecycle) for lifecycle control. |
| `codePush.checkForUpdate()` | `NativeUpdate.checkForUpdate()`. |
| Mandatory updates | The bundle's `mandatory` boolean (in the dashboard or via the upload API). |
| Rollouts (% deployment) | `Rollout %` field on each build. |
| Rollback (via CLI / portal) | Set the build's `Rollout %` to `0` or toggle `Is Active` — see [Roll back a bad bundle](./roll-back-bundle). |
| Diff packages | Not implemented — every bundle is a full ZIP. (Capacitor bundles are typically much smaller than RN bundles, so the diff savings matter less.) |
| Signing (optional in CodePush) | Mandatory in `native-update` — see Step 3 below. |

## Step 1 — Stand up the backend

Pick a `native-update` backend deployment. Three options (see [Backend → Overview](/backend/overview) for the full chooser):

The hosted SaaS at [nativeupdate.aoneahsan.com](https://nativeupdate.aoneahsan.com) is the closest analogue to CodePush-as-a-service — zero servers, pay-as-you-go.

Self-hosted Laravel from `backend/` in the `native-update` repo if you want the same data ownership you would have had with on-prem CodePush.

The Express scaffold from `example-apps/node-express/` if you want a minimal contract for your test environment.

Sign up / deploy and create an App (using your real Capacitor `appId`). Copy the API key the dashboard shows once on creation.

## Step 2 — Install `native-update` alongside `code-push`

```bash
yarn add native-update
npx cap sync
```

Keep `cordova-plugin-code-push` (or the Capacitor wrapper you used) installed for now. You will remove it in Step 6 — running both side-by-side during testing is fine; they don't share state.

## Step 3 — Generate signing keys

CodePush's signing was opt-in (most teams ran without it). `native-update` requires signing — bundles ship with a `.sig` sidecar and the SDK refuses to apply an unsigned or mis-signed bundle. Generate a keypair:

```bash
npx native-update keys generate --type rsa --size 4096
```

Store `keys/private-*.pem` in your CI's secret manager. Copy `keys/public-*.pem` contents into your `native-update.config.js`. Add `keys/private-*.pem` to `.gitignore`.

If you have a Code Signing requirement (regulated industry, App Store / Play Store enterprise contracts), `native-update`'s mandatory signing is an upgrade, not a chore — but it does add a step to the build pipeline that you didn't have before.

## Step 4 — Translate the call sites

The two methods that appear in every CodePush integration:

```ts
// BEFORE — CodePush
import codePush from 'cordova-plugin-code-push';

codePush.notifyApplicationReady();

const update = await codePush.checkForUpdate();
if (update) {
  const result = await codePush.sync(/* options */);
}
```

```ts
// AFTER — native-update
import { NativeUpdate } from 'native-update';

await NativeUpdate.notifyAppReady();

const update = await NativeUpdate.checkForUpdate();
if (update.available) {
  const result = await NativeUpdate.sync();
}
```

The semantics match closely enough that most apps need a find-and-replace plus a small config wire-up. The shapes of the returned objects differ — see [SDK Reference → Live Update → Types](/reference/sdk/live-update/types).

### `sync` option mapping

| CodePush option | `native-update` equivalent |
|---|---|
| `installMode: InstallMode.IMMEDIATE` | `updateStrategy: 'immediate'` in config. |
| `installMode: InstallMode.ON_NEXT_RESTART` | `updateStrategy: 'on-app-start'` in config. |
| `installMode: InstallMode.ON_NEXT_RESUME` | `updateStrategy: 'on-app-resume'` in config. |
| `mandatoryInstallMode` | Bundle-level `mandatory: true` set at upload time. |
| `updateDialog` | Not provided — build your own React/Vue/etc. UI calling `checkForUpdate()` then `downloadUpdate()` on confirm. |

## Step 5 — Build, sign, upload your first bundle

The CodePush workflow was `code-push release ...` — a single command did bundle + upload. The `native-update` flow splits the steps so signing fits in:

```bash
yarn build
npx native-update bundle create ./dist --version 1.0.0 --channel production
npx native-update bundle sign  ./update-bundles/bundle-1.0.0-*.zip --key ./keys/private-*.pem
# Upload via dashboard, or POST to /api/v1/bundles/upload — see API Contract.
```

For CI, see [Integrate with CI/CD (GitHub Actions)](./ci-cd-github-actions) — the example automates all three steps plus the upload.

## Step 6 — Run side-by-side, then remove CodePush

The safest cutover pattern:

1. Ship a release with both `cordova-plugin-code-push` and `native-update` installed. CodePush is still the active OTA path; `native-update` is dormant (no `sync()` calls).
2. Internally, switch your dev / staging cohort to `native-update` — they get updates via the new path, CodePush is paused for them.
3. Watch metrics for ~1 week. Compare crash rates, install-success rates, rollback rates against your CodePush historical baseline.
4. If healthy, ship a release where `native-update.sync()` is the active call and CodePush calls are commented out. CodePush plugin still installed, but inert.
5. After another ~2 weeks (covering the slow-update tail), ship a release that removes the CodePush plugin entirely.

The dual-install in Step 1 does NOT cause conflicts — each plugin manages its own bundle storage in separate filesystem locations. The cost is some duplicated bundle storage on disk during the transition; the bytes get reclaimed when the plugin is removed.

## Common gotchas

**App Center / CodePush deployment keys do not map directly.** CodePush issued one key per deployment (`Staging` and `Production` had different keys). `native-update`'s default model is one key per app, scoped to all channels. If you need per-channel keys, file an issue — the schema supports it but the dashboard UX is not wired up.

**CodePush's `sync()` blocked by default; `native-update.sync()` does not.** CodePush would download and apply within the same call. `native-update`'s `sync()` checks-and-marks-pending; the bundle applies on next launch (or via explicit `downloadUpdate()` + `reload()`). If your code assumed `sync()` was synchronous, audit the call sites.

**Bundle diffs are not supported.** CodePush could ship a diff against the previous bundle. `native-update` always ships a full ZIP. For most Capacitor apps the bundle is ~1-5 MB and the diff savings are marginal — but if you were on a CodePush diff-heavy workflow, expect bigger downloads.

**Mandatory updates work differently.** CodePush could force a mandatory update via `sync({mandatoryInstallMode: IMMEDIATE})`. `native-update` exposes the same intent via the bundle's `mandatory` flag, set at upload time. The SDK reads it from the server response and applies on next launch without prompting. There is no in-call override.

**No web SDK in CodePush, web fallback in `native-update`.** If you ran a PWA branch of your Capacitor app and excluded it from CodePush, the `native-update` web target gives you a service-worker-aware update prompt API on the same code — see [Web Platform Guide](/platforms/web).

## Verification

After Step 4 of the side-by-side phase:

```bash
adb logcat | grep -E "native-update|CodePush"
# You should see native-update logs and (during phase 1) CodePush logs.
# By phase 4, only native-update logs.
```

The dashboard's Build view shows downloads + installs incrementing as your test cohort syncs. If CodePush is still serving updates to that cohort, the new bundle from `native-update` competes — but only the active codepath in your app actually applies a bundle.

## Related

- [Your first OTA update](/tutorials/first-ota-update) — the end-to-end happy path you are reproducing for each app.
- [SDK Reference → Live Update → Methods](/reference/sdk/live-update/methods) — full method list to map your remaining CodePush call sites.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
