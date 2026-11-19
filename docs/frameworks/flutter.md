---
sidebar_position: 3
title: Flutter
description: Signed over-the-air asset updates with rollback, plus Google Play in-app update and in-app review, for Flutter apps with the native_update package from pub.dev.
keywords: [flutter ota, flutter asset updates, flutter remote config files, flutter in-app update, native_update pub.dev]
last_update:
  date: 2026-11-19
  author: Native Update team
---

# Flutter

[`native_update`](https://pub.dev/packages/native_update) brings Native Update to Flutter apps, on the same
account, licence and dashboard as the Capacitor plugin.

**What it updates:** an *asset bundle*, a ZIP of files your app reads (images, JSON config, copy). It is never
Dart code, so it stays within store policy, and the server never offers a Flutter app a code bundle.

| Package | `native_update` |
|---|---|
| Version | 1.0.1 |
| Android | minSdk 26; fully supported |
| iOS | foundation only: in-app review works, and asset updates answer `UNAVAILABLE_ON_IOS` for now |

## Install

```yaml
dependencies:
  native_update: ^1.0.1
```

Set the Android app's `minSdk` to 26 or higher. The plugin declares the INTERNET permission itself.

## Start it

Call `init` in `main()`, before any screen reads an updated file:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NativeUpdate.init(const NativeUpdateConfig(
    serverUrl: 'https://nativeupdatebe.aoneahsan.com/api',
    apiKey: String.fromEnvironment('NU_API_KEY'),       // the app's nu_app_ key
    publicKey: String.fromEnvironment('NU_PUBLIC_KEY'), // verifies every bundle
  ));
  runApp(const MyApp());
}
```

Once the first screen works, on every start:

```dart
await NativeUpdate.notifyAppReady();
```

## Read updated files

```dart
final path = await NativeUpdate.file('config/flags.json');
final flags = path != null
    ? File(path).readAsStringSync()
    : await rootBundle.loadString('assets/config/flags.json');
```

`file()` returns the updated copy, or `null` when the active bundle doesn't have it. In that case use the asset
built into the app.

## Check and download

```dart
final result = await NativeUpdate.checkForUpdate();
switch (result) {
  case UpdateAvailable(:final info):
    await NativeUpdate.download(info); // used from the next cold start
  case NativeUpdateRequired():
    // ask for a store update
  case UpToDate() || UpdateHeld():
    break;
}
```

`download(info, activation: Activation.now)` switches straight away instead.

## Publish a bundle

```bash
npx native-update bundle sign ./bundle.zip --key ./private.pem
npx native-update deploy ./bundle.zip --app com.example.app --version 1.0.1 --payload-type assets --wait
```

## What it guarantees

- **Integrity:** a bundle is used only after its SHA-256 matches and its RSA-SHA256 signature verifies. Both are
  checked again on every cold start.
- **Safety:** unpacking refuses any entry that escapes its folder (Zip-Slip) and anything over the size limits.
- **Rollback:** a new bundle that hasn't reached `notifyAppReady()` within two cold starts is rolled back, and
  that bundle is never offered to that device again.
- **New binary:** a store or sideload update retires bundles made for the older build.

## Play in-app update and review

```dart
await NativeUpdate.startPlayImmediateUpdate(); // immediate flow only
if (NativeUpdate.shouldAskForReview(successes: wins, lastAsked: lastAsked, now: DateTime.now())) {
  await NativeUpdate.requestPlayReview();
}
```

A build installed from outside Google Play gets `PlayUpdateOutcome.notPlayInstall`. Send those people to your own
download page instead.
