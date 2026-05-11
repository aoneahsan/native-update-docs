---
sidebar_position: 2
title: iOS Platform Guide
description: Everything you need to wire native-update into an iOS Capacitor app — Info.plist keys, BGTaskScheduler permitted identifiers, background mode capabilities, ATS exceptions, SKStoreReviewController throttling, keychain usage, App Store Review guideline compliance, privacy manifest entries.
keywords: [native-update ios, capacitor ios ota, bgtaskscheduler permitted identifiers, skstorereviewcontroller throttling, ios background app refresh native update, app store review guidelines ota]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# iOS Platform Guide

`native-update` runs on iOS as a Capacitor plugin written in Swift. The runtime SDK reaches iOS through the standard Capacitor bridge, but every iOS-specific surface — background tasks, store review, App Store update prompts, signing-key storage in Keychain — needs host-app integration that the plugin cannot perform on your behalf. This page is the exhaustive list. Plan ~45 minutes for first-time iOS integration; the surface is smaller than Android but Apple's constraints are stricter.

The work breaks into five areas: deployment target and Capacitor version, Info.plist additions (BGTaskScheduler identifiers, background modes, ATS), Privacy manifest, App Store Review guideline considerations, and TestFlight / Xcode debugging. The order in this page matches the order to add them to a fresh Capacitor iOS project.

## Deployment target and dependencies

The plugin's `NativeUpdate.podspec` requires `ios.deployment_target = '14.0'`. Your host app's `ios/App/Podfile` should match or exceed this. The plugin works on iOS 14 through iOS 18 — confirmed in CI; later versions follow Apple's normal SDK-compatibility window.

The plugin pulls no third-party Swift packages or pods of its own. The Swift Package Manager path (`File → Add Package Dependencies` in Xcode 15+) and the legacy CocoaPods path both work. Capacitor 8 prefers SPM; the plugin supports both. For SPM:

```
File → Add Package Dependencies → choose the `native-update` package
```

For CocoaPods:

```bash
cd ios/App
pod install
```

`npx cap sync ios` runs whichever you have set up. Mixing SPM and CocoaPods in the same project works for Capacitor's core packages but causes header-search-path conflicts with `native-update` — pick one and stick to it.

## Info.plist additions

Four Info.plist keys must live in your host app's `ios/App/App/Info.plist`. The plugin's framework Info.plist sets these for the plugin bundle itself, but iOS reads the host app's Info.plist for runtime permissions and capabilities — the plugin's version is only relevant during plugin development.

### BGTaskSchedulerPermittedIdentifiers

The background-update feature uses `BGTaskScheduler` (iOS 13+). iOS only fires background tasks whose identifier appears in this allowlist. Without it, every `BGTaskScheduler.shared.submit()` call returns `.notPermitted` and background updates silently never run.

```xml
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.aoneahsan.nativeupdate.background</string>
    <string>com.aoneahsan.nativeupdate.processing</string>
</array>
```

The two identifiers map to `BGAppRefreshTask` (short-running, ~30s budget, scheduled by iOS opportunistically) and `BGProcessingTask` (longer, ~minutes, only on charger + Wi-Fi). The plugin uses `BGAppRefreshTask` for the check-and-maybe-download flow and reserves the processing identifier for future heavier workloads.

If you change the plugin's identifiers (forking the plugin), update both this key AND the plugin's `BackgroundUpdatePlugin.swift` constants — the strings must match exactly or iOS rejects the registration. Do not change the identifiers unless you understand the consequence (every existing user's scheduled task becomes orphaned and re-schedules on next launch).

### UIBackgroundModes

The background-update feature also requires the `background-app-refresh` background mode capability. The `background-processing` mode is required if you ever use `BGProcessingTask` (the plugin reserves it but doesn't currently use it for first-class workflows).

```xml
<key>UIBackgroundModes</key>
<array>
    <string>background-app-refresh</string>
    <string>background-processing</string>
</array>
```

In Xcode's Signing & Capabilities pane, the same setting is "Background Modes" → check "Background fetch" (legacy iOS 12 alias for `background-app-refresh`) and "Background processing". Adding via Xcode's UI writes the same Info.plist key.

A capability you do NOT need for `native-update`: "Remote notifications". The plugin's notifications (Android-only — iOS uses the Apple-managed in-app prompt instead) don't ride on APNs.

### NSAppTransportSecurity

The plugin's bundle download uses URLSession over HTTPS. Apple's App Transport Security (ATS) is on by default and rejects plain HTTP. The plugin's own Info.plist (for the framework, not the host app) sets all `NSAllowsArbitraryLoads*` flags to `false` explicitly — defense-in-depth in case a host app accidentally permits arbitrary loads.

You DO need an ATS exception if you talk to a local development update server over HTTP. Add an exception only for the specific localhost / LAN domain:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>192.168.1.100</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

Never ship ATS exceptions to the App Store unless you have a compelling reason and a privacy review — App Store Review rejects exceptions without a documented technical justification. Keep development exceptions out of release builds by managing Info.plist via separate xcconfigs.

### Update prompt copy (optional)

The plugin uses `SKStoreReviewController` for in-app reviews; the system handles all copy. The plugin does NOT prompt the user for an update via an iOS-controlled UI — Apple does not provide an "App Update Prompt" API equivalent to Android's Play In-App Updates. If you want a custom prompt before redirecting users to the App Store, surface that prompt in your own React/Vue/etc. UI and call `NativeUpdate.openAppStore()` on confirm.

## Privacy manifest (iOS 17.4+)

As of May 2024, Apple requires every third-party SDK to ship a `PrivacyInfo.xcprivacy` privacy manifest declaring which Required Reason APIs it uses. The plugin's framework ships its own manifest. Your host app needs its own top-level `PrivacyInfo.xcprivacy` declaring the APIs your app uses, including any pulled in transitively by `native-update`.

The plugin uses two Required Reason APIs that you must declare:

`NSPrivacyAccessedAPICategoryUserDefaults` (`UserDefaults`) — the plugin caches non-sensitive state like the last sync timestamp. The reason code is `CA92.1` ("Access info from same app, per documentation").

`NSPrivacyAccessedAPICategoryFileTimestamp` (`File timestamp APIs`) — the plugin checks bundle file mtimes during install. The reason code is `C617.1` ("Inside app or group container").

Your host app's `PrivacyInfo.xcprivacy` (drop into `ios/App/App/`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array><string>CA92.1</string></array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array><string>C617.1</string></array>
        </dict>
    </array>
</dict>
</plist>
```

The plugin's own privacy manifest may evolve — re-check the plugin's `ios/PrivacyInfo.xcprivacy` on every upgrade and add any new categories to your host app's manifest. App Store Connect's "Privacy Manifest Issues" upload report flags missing entries.

## SKStoreReviewController throttling

The plugin's `requestReview()` calls `SKStoreReviewController.requestReview(in:)`. Apple's documented limit is 3 prompts per user per 365-day window per app. iOS itself enforces this — your code can call `requestReview()` as often as you like; iOS will silently no-op the 4th+ call.

The plugin layers its own throttling on top, configurable via `AppReviewConfig`:

`minimumLaunchesBeforeReview` (default 3) — won't prompt until the user has launched the app this many times. Setting to 1 ships a prompt to first-launch users, which Apple's guidelines discourage (review-prompt fatigue).

`minimumDaysBeforeReview` (default 7) — won't prompt until at least this many days since first launch. Stops "thanks for downloading us 5 minutes ago, please review us" prompts.

`minimumDaysSinceLastPrompt` (default 90) — won't prompt twice within this many days. Apple's own throttle hard-caps this at 365 days / 3 prompts; the plugin's 90-day default keeps you well inside.

There is no programmatic feedback from iOS whether the prompt actually rendered. The plugin's `requestReview()` returns `{ displayed: true }` on a successful API call regardless — Apple intentionally hides the outcome to discourage prompt-tuning loops. Treat the call as fire-and-forget and don't gate any logic on whether the prompt was shown.

See [SDK Reference → App Review → Overview](/reference/sdk/app-review/overview) for the configurable knobs and the recommended call-site pattern.

## App Store Review guideline compliance

App Store Review Guideline 2.5.2 prohibits executing code downloaded from a remote source if it changes app functionality, with one named exception: JavaScript executed by Apple's stock WebView (`WKWebView`) that does not provide app-store-bypass functionality. Capacitor apps run their entire JS layer in `WKWebView`, so `native-update`'s OTA flow — replacing bundled web assets at runtime — is within the exception.

Two boundaries the plugin respects, that you should not push against:

The plugin only replaces web assets — HTML, CSS, JS, fonts, images. It does NOT swap native Swift binaries; it cannot, because iOS app sandboxing prevents apps from executing arbitrary binaries from app storage. If you try to ship a bundle that includes a `.dylib` or compiled native code, the plugin's bundle-create CLI will accept it (it ZIPs everything you point at) but the install will fail at runtime when iOS refuses to load the binary.

The plugin's `min_native_version` field is the canonical way to coordinate JS that depends on new native code. Push a new app-store binary first; once it has a healthy adoption rate, push the OTA bundle with `min_native_version` set to the new binary version. Older binaries skip the bundle automatically.

Reject reasons we've seen in production for Capacitor apps using `native-update`:

"App downloads code that changes functionality" — when the reviewer detects an OTA download in a TestFlight test that adds a brand-new top-level feature not present in the binary they reviewed. The fix is to ship the feature in the binary at submission time, then iterate via OTA. Don't ship a stub-app to App Store Review and grow it via OTA.

"App Store Review Guideline 4.2.2" (minimum functionality) — when an app does too little at launch and only "fills in" via OTA. Same fix: ship a complete app, use OTA for bug fixes and iterations.

## Keychain usage

The plugin's signing-key storage (when you use the SDK's `setSigningKey()` instead of the compile-time `publicKey` config) writes to the iOS Keychain via `kSecClassGenericPassword` with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. That means:

The key is encrypted at rest by iOS using the device's hardware secure enclave. Even a full filesystem dump from a jailbroken device won't expose the key without the device's user passcode.

The key is bound to the specific device — it won't migrate to a new device via iCloud Keychain or a device-to-device transfer. After a device replacement, the user's app reinstalls fresh and re-fetches the public key from the server (or uses the compile-time key).

The key is bound to the specific app — uninstalling the app deletes the keychain entry; reinstalling the app creates a fresh empty keychain.

This is exactly what you want for OTA signing keys. The plugin uses the same accessibility level for the SDK's internal token cache.

## TestFlight and Xcode debugging

The In-App Review API and the bundle-signature-verification path are the two iOS-specific features that benefit from TestFlight testing:

For In-App Review prompts: install your app from TestFlight (not from Xcode). The system review prompt only renders on App Store / TestFlight builds; Xcode-installed development builds suppress it. Apple's docs spell this out — there is no workaround.

For bundle signature verification: TestFlight builds use App Store certificates which are different from Xcode's development certs. If you ship a bundle signed by a key that worked in Xcode but fails in TestFlight, the issue is almost always that the bundle's signature is fine — the failure is in your `publicKey` config inside `native-update.config.js` not matching the signing private key. Re-verify with `npx native-update bundle verify`.

Useful Xcode log filters during debugging (Console.app → process: your app name):

`native-update` — every plugin log line is prefixed with this string. Filter Console.app and you see only this plugin's output.

`BGTaskScheduler` — iOS system logs about background-task scheduling. Useful when background updates don't fire — you'll see `notPermitted` (Info.plist missing the identifier), `tooManyPendingTaskRequests` (another task already queued), or `unavailable` (simulator or Low Power Mode).

`SKStoreReviewController` — iOS system logs about review-prompt suppression. Useful when the prompt doesn't appear despite `requestReview()` succeeding — you'll see the OS-level throttle decision.

## What the plugin does NOT do on iOS

Push-notification-driven updates. The plugin uses local notifications on Android only; on iOS it relies on `BGTaskScheduler` for background work. If you want to push an update via APNs, you build that integration yourself — the plugin doesn't ship APNs handling.

Forced app-store updates. The App Update API has no iOS equivalent. The plugin's `getAppUpdateInfo()` on iOS compares the installed binary version against the latest App Store version (fetched from iTunes Lookup API) and returns the result; you decide what to show the user. There is no `performImmediateUpdate()` analogue on iOS — that's an Android-only Play Core feature.

WatchOS / tvOS / visionOS support. The plugin compiles for iOS only. Capacitor's WatchOS extension support is limited and the plugin has not been tested there. File an issue if you need this.

## Smoke testing on iOS

```bash
yarn build                    # Build your web app
npx cap sync ios              # Sync into ios/
npx cap open ios              # Open in Xcode
```

Run on a simulator or device and confirm:

A `NativeUpdate.sync()` call from your app's startup code returns a result — even `available: false` proves the bridge wired up. Xcode's console shows `[native-update]`-prefixed logs.

`NativeUpdate.notifyAppReady()` from the same code path completes without error. Same gotcha as Android: skipping this leaves the SDK in "pending review" state.

For background tasks, run on a real device (the simulator doesn't fire background tasks reliably). Schedule via `enableBackgroundUpdates()`, lock the device, plug in, and wait. iOS fires tasks opportunistically — anywhere from minutes to hours. Force a fire via Xcode's debugger: `Debug → Simulate Background Fetch` or in the LLDB console:

```
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.aoneahsan.nativeupdate.background"]
```

(The private `_simulate*` selectors only work on Xcode-attached debug builds; release builds reject them.)

## Next steps

- Read the [Android Platform Guide](./android) — the parallel surface for Android.
- Read [SDK Reference → Background Update → Overview](/reference/sdk/background-update/overview) for the cross-platform scheduling model.
- Read [SDK Reference → App Review → Overview](/reference/sdk/app-review/overview) for the recommended call-site pattern around Apple's review-prompt throttle.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
