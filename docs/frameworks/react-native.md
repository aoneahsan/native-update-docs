---
sidebar_position: 2
title: React Native
description: Signed over-the-air JavaScript bundle updates with rollback, plus Google Play in-app update and in-app review, for React Native 0.80+ apps with native-update-react-native.
keywords: [react native ota, react native code push alternative, react native bundle update, hermes ota update, native-update-react-native]
last_update:
  date: 2026-11-19
  author: Native Update team
---

# React Native

`native-update-react-native` updates a React Native app's JavaScript bundle over the air, on the same account,
licence and dashboard as the Capacitor plugin.

| Package | `native-update-react-native` |
|---|---|
| Version | 1.0.1 |
| React Native | 0.80 or newer, New Architecture (TurboModule) |
| Android | minSdk 26 |
| iOS | not yet: the package links on Android only |

## Install

```bash
yarn add native-update-react-native
```

The SDK starts natively, before React loads, so that a bundle which breaks the app can still be rolled back.
Point the React host at the active OTA bundle:

```kotlin
// android/app/src/main/java/.../MainApplication.kt
class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
      jsBundleFilePath = NativeUpdateReactNative.bundleFile(), // null = the bundle inside the APK
    )
  }

  override fun onCreate() {
    NativeUpdateReactNative.init(
      this,
      NativeUpdateConfig.Builder(
        "https://nativeupdatebe.aoneahsan.com/api",
        BuildConfig.NU_API_KEY,    // the app's nu_app_ key
        BuildConfig.NU_PUBLIC_KEY, // verifies every bundle
      ).build(),
    )
    super.onCreate()
    loadReactNative(this)
  }
}
```

## Use it from JavaScript

```ts
import * as NativeUpdate from 'native-update-react-native';

// Once the app has rendered and works, on every start:
await NativeUpdate.notifyAppReady();

const result = await NativeUpdate.checkForUpdate();
if (result.type === 'available') {
  await NativeUpdate.download(result.info); // runs from the next cold start
}
```

For an update that has to run now, `download(info, 'now')` followed by `restart()` relaunches the app on the new
bundle. Only do this when the person expects the restart.

## Publish a bundle

Build the bundle the way a release build does, compile it to Hermes bytecode, and deploy the folder:

```bash
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output out/index.android.bundle --assets-dest out
node_modules/hermes-compiler/hermesc/linux64-bin/hermesc -O -emit-binary \
  -out out/index.android.bundle.hbc out/index.android.bundle
mv out/index.android.bundle.hbc out/index.android.bundle
npx native-update deploy ./out --app com.example.app --version 1.0.1 --min-native 1.0.0 --wait
```

Set `--min-native` to the app version the bundle was built against. A JavaScript bundle can only call the native
modules its binary has, so a release that adds or changes native code goes through the store.

## What it guarantees

- **Integrity:** a bundle runs only after its SHA-256 matches and its RSA-SHA256 signature verifies. Both are
  checked again on every cold start, before React loads.
- **Rollback:** a new bundle that hasn't reached `notifyAppReady()` within two cold starts is rolled back to the
  previous one, and that bundle is never offered to that device again.
- **New binary:** a store update retires bundles made for the older build.
- **Payload safety:** the server only offers a React Native app JavaScript bundles, never a native asset set.

## Play in-app update and review

```ts
await NativeUpdate.startPlayImmediateUpdate(); // immediate flow only
if (NativeUpdate.shouldAskForReview({ successes, lastAskedMs, nowMs: Date.now() })) {
  await NativeUpdate.requestPlayReview();
}
```
