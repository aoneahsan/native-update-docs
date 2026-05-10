---
sidebar_position: 1
title: Installation
description: Install the native-update Capacitor plugin into a new or existing Capacitor 8 project. Covers npm install, iOS pod install, Android sync, and verification.
keywords: [native-update install, capacitor plugin install, native-update setup, OTA install]
last_update:
  date: 2026-05-10
  author: Ahsan Mahmood
---

# Installation

This guide installs `native-update` into an existing Capacitor 8 project. If you do not yet have a Capacitor project, create one first with the [official Capacitor docs](https://capacitorjs.com/docs/getting-started). The minimum supported environment is Node.js 18 and Capacitor 8.

## Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| Node.js | 18.0.0 | Test environment is Node 20 LTS. |
| Yarn | 1.22+ or 4.x (recommended) | npm and pnpm work, but the project itself ships `yarn@4.10.3` and is tested with it. |
| Capacitor | `@capacitor/core ^8.0.1` | Plugin's peer dependency. v7 and earlier are not supported by v3. |
| Xcode | 15+ | Required only for iOS builds. Apple Silicon Macs supported. |
| Android Studio | Hedgehog (2023.1) or newer | Required only for Android builds. |
| JDK | 17 | Capacitor 8 requires JDK 17 for Android builds. |

## Step 1 — Add the package

```bash
yarn add native-update
# or: npm install native-update
# or: pnpm add native-update
```

This installs:

- The TypeScript SDK (`dist/esm/`)
- The CLI (`cli/index.js`, exposed as the `native-update` bin)
- Android sources (`android/src/main/` — auto-discovered by Capacitor's Gradle plugin)
- iOS sources (`ios/Plugin/` — referenced by `NativeUpdate.podspec`)

## Step 2 — Sync native projects

```bash
npx cap sync
```

This single command:

- Copies the plugin's `manifest-additions.xml` into your Android `AndroidManifest.xml`
- Adds the plugin to your `android/app/capacitor.build.gradle`
- Adds the pod entry to `ios/App/Podfile`
- Runs `pod install` on iOS (if Xcode is installed)

If you only want to sync one platform: `npx cap sync ios` or `npx cap sync android`.

## Step 3 — iOS-specific setup

Open the iOS workspace once after `cap sync`:

```bash
cd ios/App && open App.xcworkspace
```

The pod is now in your project. You do not normally need to touch `Info.plist` for the live-update feature, but **background updates** require these capabilities and Info.plist keys (covered in detail in the *Platform — iOS* guide, Batch 7):

- Capability: **Background Modes** → **Background fetch** and **Background processing**
- Info.plist: `BGTaskSchedulerPermittedIdentifiers` array containing your plugin's task identifier

## Step 4 — Android-specific setup

`npx cap sync` injects the merged manifest entries automatically. The plugin uses:

- `INTERNET` (always granted)
- `ACCESS_NETWORK_STATE` (for network-aware background updates)
- `POST_NOTIFICATIONS` (Android 13+, only if you enable background-update notifications)
- `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_DATA_SYNC` (only if you opt into background downloads)

Inspect the merged manifest at `android/app/build/intermediates/merged_manifests/*/AndroidManifest.xml` after a build to confirm. Detailed permission audit lives in the *Platform — Android* guide, Batch 7.

## Step 5 — Verify the install

Add a quick verification call to your app entry point:

```typescript
import { NativeUpdate } from 'native-update';

async function verify() {
  // Cheap call — does not hit the network or take any action.
  const ready = await NativeUpdate.isInitialized();
  console.log('[native-update] initialized?', ready);
}

verify();
```

Run your app:

```bash
npx cap run ios     # or: npx cap run android
```

A successful install logs `[native-update] initialized? false` (false because you have not called `initialize()` yet — that happens in the [Quick Start](/getting-started/quick-start)). If you instead see "Plugin not implemented on android/ios", the native sources have not been picked up — re-run `npx cap sync` and clean the native build (`./gradlew clean` for Android, `Product → Clean Build Folder` for iOS).

## Step 6 — (Optional) Install the CLI globally

The CLI is shipped inside the `native-update` package and is invokable via `npx native-update <command>` immediately after step 1. If you want a global binary:

```bash
yarn global add native-update
# or: npm install -g native-update

native-update --help
```

You will use the CLI in the [Quick Start](/getting-started/quick-start) to generate signing keys and create your first bundle.

---

## Troubleshooting common install errors

### "Plugin not implemented on android"

Run `npx cap sync android`, then in Android Studio do **Build → Clean Project** and **Build → Rebuild Project**. If still failing, open `android/app/build.gradle` and confirm `implementation project(':native-update')` is present (Capacitor's Gradle plugin should add this automatically).

### "Plugin not implemented on ios"

Run `cd ios/App && pod install --repo-update`. If you are on Apple Silicon and pod install fails with architecture errors, prefix with `arch -x86_64` and re-run.

### "Cannot find module 'native-update' or its corresponding type declarations"

Restart your TypeScript server. In VS Code: Cmd+Shift+P → **TypeScript: Restart TS Server**. The package ships `dist/esm/index.d.ts` and is picked up via the `types` field in `package.json`, but editor caches sometimes lag.

### `peerDependencies` warning on install

`native-update` requires `@capacitor/core ^8.0.1`. If your project is on Capacitor 7 or earlier, upgrade Capacitor first: `npx @capacitor/cli@latest migrate`.

### Bundle size concern

The package is small (under 60 KB minified) and tree-shakeable. Importing only what you use is enough — there is no separate "lite" build.

---

## Next steps

- **[Quick Start](/getting-started/quick-start)** — wire your first OTA update in 5 minutes (3 of which are downloading native build tools).
- **CLI reference** (Batch 5) — for `keys generate`, `bundle create`, `bundle sign`.
- **Backend setup** (Batch 6) — to self-host the update server.

---

<div className="nu-author-card">
Maintained by <a href="https://aoneahsan.com">Ahsan Mahmood</a>. Found a bug or unclear step? Open an issue at <a href="https://github.com/aoneahsan/native-update-docs/issues">native-update-docs/issues</a>.
</div>
