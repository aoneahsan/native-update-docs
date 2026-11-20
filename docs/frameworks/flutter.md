---
sidebar_position: 3
title: Flutter
description: Signed over-the-air asset updates with rollback, Dart code updates for sideloaded Android builds, plus Google Play in-app update and in-app review, for Flutter apps with the native_update package from pub.dev.
keywords: [flutter ota, flutter asset updates, flutter code push, flutter dart code update, flutter in-app update, native_update pub.dev]
last_update:
  date: 2026-11-20
  author: Native Update team
---

# Flutter

[`native_update`](https://pub.dev/packages/native_update) brings Native Update to Flutter apps, on the same
account, licence and dashboard as the Capacitor plugin.

**What it updates:** an *asset bundle*, a ZIP of files your app reads (images, JSON config, copy), on every
install. From 1.1.0, an app you distribute outside Google Play can also take updates to its Dart code
([below](#dart-code-updates-sideloaded-android-builds)). A build installed from Google Play never asks for one.

| Package | `native_update` |
|---|---|
| Version | 1.1.1 |
| Android | minSdk 26; fully supported |
| iOS | foundation only: in-app review works, and asset updates answer `UNAVAILABLE_ON_IOS` for now |

## Install

```yaml
dependencies:
  native_update: ^1.1.1
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

## Dart code updates (sideloaded Android builds)

Play does not allow apps to download code, so this is for apps you hand out yourself: a direct APK download, an
enterprise rollout, a test group. A build installed from Google Play never asks for a code patch and never loads
one, even with the switch on. iOS does not take them.

1. Make `MainActivity` extend `NativeUpdateFlutterActivity`, or `NativeUpdateFlutterFragmentActivity` when it must be a
   `FlutterFragmentActivity` (as `local_auth` requires). It picks the Dart code to run before the Flutter engine
   starts, so a bad patch can never stop the app from starting.
2. Put the configuration in `android/app/src/main/AndroidManifest.xml`, inside `<application>`:

   ```xml
   <meta-data android:name="com.aoneahsan.native_update.SERVER_URL" android:value="https://nativeupdatebe.aoneahsan.com/api" />
   <meta-data android:name="com.aoneahsan.native_update.API_KEY" android:value="nu_app_..." />
   <meta-data android:name="com.aoneahsan.native_update.PUBLIC_KEY" android:value="MIIC..." />
   <meta-data android:name="com.aoneahsan.native_update.CODE_UPDATES" android:value="true" />
   ```

3. In `main()`, call `await NativeUpdate.initFromManifest();` instead of `init(...)`, then `notifyAppReady()` once the
   app is up, as with asset bundles.

To ship new Dart code, build a release APK of it with the same Flutter version as the installed app, then:

```bash
npx native-update bundle flutter-patch build/app/outputs/flutter-apk/app-release.apk -o patch.zip
npx native-update deploy patch.zip --app com.example.app --version 1.0.2 --payload-type dart_aot --wait
```

How it behaves:

- **One engine per patch.** [`bundle flutter-patch`](../reference/cli/bundle-flutter-patch.md) records the SHA-256 of
  the APK's `libflutter.so` in `patch.zip.runtime-keys`. The server offers the patch only to installs running that
  engine and answers `RUNTIME_MISMATCH` to the rest. After a Flutter upgrade, ship a new APK first.
- **Whole program, not a diff.** A patch is the complete compiled Dart code. Any APK install sets it aside, even one
  that kept `versionCode` and `versionName`, so a patch never outlives the APK it was built from.
- **Same checks as asset bundles.** SHA-256 and RSA-SHA256 before the engine starts, rollback after two starts without
  `notifyAppReady()`, and a rolled-back version is not offered to that device again.
- `NativeUpdate.codeUpdatesActive()` says whether the running Dart code came from a patch.

## What it guarantees

- **Integrity:** a bundle is used only after its SHA-256 matches and its RSA-SHA256 signature verifies. Both are
  checked again on every cold start.
- **Safety:** unpacking refuses any entry that escapes its folder (Zip-Slip) and anything over the size limits.
- **Rollback:** a new bundle that hasn't reached `notifyAppReady()` within two cold starts is rolled back, and
  that bundle is never offered to that device again.
- **New binary:** a store or sideload update retires bundles made for the older build. With code updates on, any
  APK install retires them.

## Play in-app update and review

```dart
await NativeUpdate.startPlayImmediateUpdate(); // immediate flow only
if (NativeUpdate.shouldAskForReview(successes: wins, lastAsked: lastAsked, now: DateTime.now())) {
  await NativeUpdate.requestPlayReview();
}
```

A build installed from outside Google Play gets `PlayUpdateOutcome.notPlayInstall`. Send those people to your own
download page instead.
