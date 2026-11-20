---
sidebar_position: 6
title: bundle flutter-patch — Turn a Flutter APK into a Dart code update
description: native-update bundle flutter-patch takes a Flutter release APK and writes a dart_aot patch ZIP plus the engine hash it runs on, ready to deploy to sideloaded Android installs of the native_update package.
keywords: [native-update flutter-patch, flutter code push, dart_aot, flutter ota code update, libapp.so patch]
last_update:
  date: 2026-11-20
  author: Native Update team
---

# `bundle flutter-patch` — Turn a Flutter APK into a code update

**`native-update bundle flutter-patch <apk>` reads a Flutter release APK and writes a patch ZIP holding its compiled
Dart code (`lib/<abi>/libapp.so` for every architecture in the APK), plus a `.runtime-keys` file naming the Flutter
engine the patch runs on.** Deploy the ZIP with `--payload-type dart_aot`. Only apps using
[`native_update` 1.1.0+ with code updates on](../../frameworks/flutter.md#dart-code-updates-sideloaded-android-builds)
take it, and never a build installed from Google Play.

The command works on local files only and makes no network calls.

## Synopsis

```bash
npx native-update bundle flutter-patch <apk> [-o patch.zip] [--assets <dir>]
```

| Option | Default | Notes |
|---|---|---|
| `-o, --output <file>` | `flutter-patch.zip` | Where the patch ZIP goes; `<file>.runtime-keys` is written beside it |
| `--assets <dir>` | — | Also ship the files in this folder, read in the app with `NativeUpdate.file()` |

## Example

```bash
flutter build apk --release
npx native-update bundle flutter-patch build/app/outputs/flutter-apk/app-release.apk -o patch.zip
npx native-update deploy patch.zip --app com.example.app --version 1.0.2 --payload-type dart_aot --wait
```

`deploy` reads `patch.zip.runtime-keys` on its own. Without `--signature`, the server signs the patch with the app's
stored key; with your own key, run [`bundle sign`](./bundle-sign.md) first.

## The engine key

`.runtime-keys` holds the SHA-256 of the APK's `libflutter.so`. The device sends the same hash for the engine it is
running, and the server offers the patch only on a match. Every other install gets `RUNTIME_MISMATCH` and keeps the
code it has. Build the patch with the same Flutter version as the APK your users have; after a Flutter upgrade, ship
a new APK before any patch built with it.
