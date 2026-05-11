---
sidebar_position: 1
title: Android Platform Guide
description: Everything you need to wire native-update into an Android Capacitor app — required permissions, manifest additions for background updates, WorkManager constraints, Play Core integration, ProGuard rules, signing setup, and Play Console-compliance pitfalls.
keywords: [native-update android, capacitor android ota, workmanager background update, play core in-app update, proguard rules native update]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Android Platform Guide

`native-update` runs on Android as a Capacitor plugin written in Kotlin. The runtime SDK reaches Android through the standard Capacitor bridge, but several features — background updates, in-app store updates, in-app reviews — require host-app integration that the plugin can't perform on your behalf. This page is the exhaustive list of what you have to add to your Android project. Plan ~30 minutes for first-time integration on a fresh Capacitor app; less for an existing one.

The integration work splits into four areas: SDK + permission setup, manifest additions for the background-update service, Play Core dependency wiring for native app updates and reviews, and the release-build concerns (ProGuard / R8, signing). Each area is small in isolation; the order in this page mirrors the order to add them.

## Capacitor and Android-Gradle versions

The plugin's `android/build.gradle` targets `minSdkVersion 22` (Android 5.1 Lollipop), `compileSdkVersion` to the latest stable, Kotlin 1.9.22, and uses Play Core 2.1.0 for in-app updates plus Play Review 2.0.1 for in-app reviews. Your host app's `android/app/build.gradle` should match or exceed these.

If you are on Capacitor 6 or 7, `npx cap sync android` resolves the plugin's gradle dependencies automatically. Capacitor 8 changes the artifact resolution slightly but the plugin works without modification. Mixing Capacitor majors between your host app and other plugins is the most common source of `Duplicate class` errors at build time — keep `@capacitor/core`, `@capacitor/android`, and `@capacitor/cli` on the same major version.

## Required permissions

The plugin's `android/src/main/AndroidManifest.xml` declares six permissions that auto-merge into your host app's manifest at build time. You should know what each one does, because the Play Console will ask. The first two are always required; the next four are only required if you enable background updates.

`INTERNET` and `ACCESS_NETWORK_STATE` are normal permissions Android grants at install time without prompting. The first lets the SDK make HTTP calls to your update server; the second lets it check connectivity before scheduling a download. No Play Console disclosure needed — these are the most common Android permissions and don't surface in the Data Safety form.

`WAKE_LOCK` lets the WorkManager-driven background-update worker keep the CPU awake during a download. `FOREGROUND_SERVICE` is required from Android 9 (API 28) onwards for any service that needs to run while the app is not visible — WorkManager's foreground service mode falls under this. `POST_NOTIFICATIONS` is required from Android 13 (API 33) onwards to show the "Update downloaded, tap to install" notification. `RECEIVE_BOOT_COMPLETED` lets WorkManager rehydrate scheduled jobs after the device reboots so the background-update schedule survives.

If your app does not use the background-update feature (you only call `sync()` from the foreground), you can suppress the latter four permissions in your host app's manifest with the `tools:node="remove"` attribute. The plugin still works for foreground sync without them.

```xml
<!-- android/app/src/main/AndroidManifest.xml — only if NOT using background updates -->
<uses-permission
    android:name="android.permission.WAKE_LOCK"
    tools:node="remove" />
<uses-permission
    android:name="android.permission.FOREGROUND_SERVICE"
    tools:node="remove" />
<uses-permission
    android:name="android.permission.POST_NOTIFICATIONS"
    tools:node="remove" />
<uses-permission
    android:name="android.permission.RECEIVE_BOOT_COMPLETED"
    tools:node="remove" />
```

Add `xmlns:tools="http://schemas.android.com/tools"` to the `<manifest>` root if it is not already there.

## Manifest additions for background updates

If you DO use background updates, two pieces of XML must live inside your host app's `<application>` tag — they cannot auto-merge from the plugin because they depend on WorkManager's foreground-service contract. The plugin ships these snippets in `android/manifest-additions.xml`. Without them: background-update calls crash with `ServiceNotFoundException` and notification action buttons appear but don't respond to taps.

```xml
<!-- android/app/src/main/AndroidManifest.xml — inside <application> -->

<!-- WorkManager foreground service for background updates -->
<service
    android:name="androidx.work.impl.foreground.SystemForegroundService"
    android:foregroundServiceType="dataSync"
    tools:node="merge" />

<!-- Broadcast receiver for notification action buttons -->
<receiver
    android:name="com.aoneahsan.nativeupdate.NotificationActionReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="com.aoneahsan.nativeupdate.UPDATE_NOW" />
        <action android:name="com.aoneahsan.nativeupdate.UPDATE_LATER" />
        <action android:name="com.aoneahsan.nativeupdate.DISMISS" />
    </intent-filter>
</receiver>
```

The `tools:node="merge"` on the service tells Manifest-Merger to merge attributes if you already declare the same service (you usually don't), instead of failing the build with a duplicate-class error. The `android:exported="false"` on the receiver is required from Android 12 (API 31) onwards for any component that doesn't need to be reachable from outside your app — the receiver only handles intents the plugin itself fires.

## WorkManager constraints

`enableBackgroundUpdates()` schedules a `PeriodicWorkRequest` via WorkManager. The plugin uses three constraints driven by the `BackgroundUpdateConfig` you pass at runtime:

`requireWifi` (default `true`) maps to `NetworkType.UNMETERED` — the worker only fires on Wi-Fi or unmetered cellular. When `false`, it relaxes to `NetworkType.CONNECTED` (any network including metered cellular). Production apps almost always want `true`; data-heavy bundles on metered connections are how you lose your one-star rating.

`requireBatteryNotLow` (default `true`) maps to `setRequiresBatteryNotLow(true)`. The worker won't fire when the device is below 15% battery. Background work on a dying battery is the second-most-common cause of one-star reviews.

`requireCharging` (default `false`) maps to `setRequiresCharging(true)`. Enable for large bundles or aggressive update cadences — the worker waits until the device is plugged in. Disabled by default because most apps prefer fresher updates over politer power use.

WorkManager itself adds its own gating that you cannot override: Doze Mode and App Standby Buckets defer the worker for hours or days if the device decides the app is unused. The minimum interval for `PeriodicWorkRequest` is 15 minutes — the plugin enforces this minimum even if you pass a shorter `checkInterval`. See [SDK Reference → Background Update → Overview](/reference/sdk/background-update/overview) for the full constraint cascade.

## Play Core: in-app updates and in-app reviews

The plugin uses Google Play Core 2.1.0 for the App Update API and Play Review 2.0.1 for the In-App Review API. Both are pulled transitively by `npx cap sync` — you do not need to add them to your host app's `build.gradle`. The only requirement is that your APK or AAB ships through the Play Store and is signed by Google Play App Signing. Sideloaded APKs cannot use the App Update API (every call returns `ERROR_API_NOT_AVAILABLE`).

The In-App Review API has Apple-style throttling that Google does not document precisely. Empirically it tops out around three prompts per user per year and rate-limits per app per session. The plugin's `requestReview()` returns silently when the OS chooses not to show the prompt — there is no UI fallback because Google's docs explicitly forbid one ("don't show a custom prompt before calling the API"). See [SDK Reference → App Review → Overview](/reference/sdk/app-review/overview) for the throttling caveats.

For development testing, install your app from the Play Console's internal testing track. The review prompt and the App Update API both run in a "fake but real" mode against the internal-testing channel, which is the only way to exercise them outside production.

## Network security configuration

The plugin downloads bundles over HTTPS. Android 9 (API 28) and above default to disallowing cleartext traffic for the whole app, so HTTP-only update servers won't work even if your code calls `http://`. If you need cleartext for local development (e.g. talking to `npx native-update server start` on your dev machine), add a network security config:

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>     <!-- Android emulator → host -->
        <domain includeSubdomains="true">192.168.1.0/24</domain>  <!-- your LAN -->
    </domain-config>
</network-security-config>
```

```xml
<!-- android/app/src/main/AndroidManifest.xml — on <application> -->
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

Keep this config to development builds only — production should never permit cleartext. The plugin's certificate-pinning feature (see [SDK Reference → Security → Certificate Pinning](/reference/sdk/security/certificate-pinning)) layers on top of HTTPS and rejects mismatched server certs at the SDK level.

## ProGuard / R8 rules

The plugin ships its own `android/proguard-rules.pro` which auto-applies when your host app enables R8 minification. The rules keep the plugin's public classes (`com.aoneahsan.nativeupdate.**`), OkHttp's internal classes (needed because OkHttp uses reflection for ALPN), Play Core's `com.google.android.play.**`, and AndroidX Security Crypto (`androidx.security.crypto.**`) intact.

If your host app's R8 step strips a class the plugin needs at runtime, you will see one of:

`NoClassDefFoundError: com.aoneahsan.nativeupdate.SecurityManager` — your minification removed plugin classes. Verify `getDefaultProguardFile('proguard-android-optimize.txt')` is being used (it includes consumer rules from libraries) and that no overzealous `-dontkeep` rule overrides the plugin's `-keep`.

`UnsatisfiedLinkError` mentioning OkHttp or Conscrypt — your config stripped OkHttp's reflection target. Add `-keep class okhttp3.internal.publicsuffix.PublicSuffixDatabase` if it isn't already in the merged config.

`NoSuchMethodError` in Play Core flows — your config stripped a Play Core method. The plugin's `-keep class com.google.android.play.** { *; }` covers this; verify it merged.

For release builds:

```groovy
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}
```

## Signing setup

Your host app needs to be signed by Google Play App Signing for the In-App Update API to work. The setup happens in the Play Console once per app — enable "Use Play App Signing" when you first upload an AAB to internal testing, and Play handles the signing for you.

For the OTA update itself, the plugin's bundle-signature verification is independent of Android's APK signature. The OTA flow uses an RSA-SHA256 signature over the bundle ZIP (generated by `npx native-update bundle sign`), verified against the public key shipped inside your app's `native-update.config.js`. See [SDK Reference → Security → Overview](/reference/sdk/security/overview) for the three-layer signing model.

## Play Console rejection rules

Two patterns surface frequently in Play Console rejections when shipping a Capacitor app with the plugin:

**Undeclared sensitive permissions.** The plugin's manifest-merged permissions are all non-sensitive (`INTERNET`, `WAKE_LOCK`, etc.) — but other Capacitor plugins frequently inject `CAMERA`, `RECORD_AUDIO`, or `ACCESS_FINE_LOCATION` into the merged manifest even when your app's code never uses them. Inspect the merged manifest at `android/app/build/intermediates/merged_manifests/release/AndroidManifest.xml` before every upload. Sensitive permissions in the merged manifest require a privacy-policy disclosure plus a Data Safety form entry — and a sensible runtime-prompt UX inside the app.

**Foreground service without a notification.** Android 13 (API 33) and above require any foreground service to display a persistent notification. The plugin's WorkManager foreground-service usage shows a "Downloading update..." notification while the worker runs — that's the required notification. Suppressing it (via a custom `NotificationManager` config that hides it) violates Play policy and gets the AAB rejected.

## Edge-to-edge and gesture insets

Android 15 (API 35) enforces edge-to-edge layouts and gesture navigation by default. The plugin's notification flow uses the system notification UI (not in-app), so the plugin itself has no edge-to-edge concerns. Your host app's own UI must handle WindowInsets correctly — see the Capacitor 8 edge-to-edge migration guide in your Capacitor version's docs. This is a host-app responsibility unrelated to `native-update`.

## Smoke testing on Android

After integrating:

```bash
yarn build                    # Build your web app
npx cap sync android          # Sync into android/
npx cap open android          # Open in Android Studio
```

Run on a device or emulator and confirm:

A `NativeUpdate.sync()` call from your app's startup code returns a result (it can be `available: false` if no update is published — that proves the call reached the bridge). Watch `adb logcat | grep native-update` for the plugin's log output; nothing means the JS never reached the native side.

`NativeUpdate.notifyAppReady()` from the same code path completes without error. Skipping this call leaves the SDK in "pending review" state and the next bundle never applies.

For background updates: call `NativeUpdate.enableBackgroundUpdates()`, force-stop the app, plug in the device, and wait. WorkManager fires the worker after a minimum 15 minutes — `adb logcat | grep BackgroundUpdateWorker` confirms it ran. There is no faster way to force-trigger a `PeriodicWorkRequest`; for development, use `WorkManager.enqueueUniqueWork()` with a `OneTimeWorkRequest` and watch the same logs.

## Next steps

- Read the [iOS Platform Guide](./ios) — the parallel surface for iOS.
- Read [SDK Reference → Background Update → Config](/reference/sdk/background-update/config) for the full constraint surface.
- Check the merged `AndroidManifest.xml` after the first build for unexpected permission entries from other plugins (see Play Console rejection rules above).

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
