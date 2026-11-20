---
sidebar_position: 1
title: Native Android (Kotlin and Java)
description: Signed over-the-air asset updates, Google Play in-app update and in-app review for native Kotlin or Java Android apps with com.aoneahsan:native-update-android.
keywords: [native android ota, kotlin asset updates, android in-app update library, play in-app review kotlin, native-update-android]
last_update:
  date: 2026-11-20
  author: Native Update team
---

# Native Android (Kotlin and Java)

`com.aoneahsan:native-update-android` brings Native Update to an Android app written in Kotlin or Java. It uses
the same account, licence and dashboard as the Capacitor plugin.

**What it updates:** an *asset bundle*, a ZIP of files your app reads (images, JSON config, copy), never code.
Google Play doesn't allow a native app to download code, and the server never offers a native app a code bundle.
For code changes, ship a store release; the library's Play in-app update helper brings people onto it.

| Package | `com.aoneahsan:native-update-android` |
|---|---|
| Version | 1.2.0 |
| Android | minSdk 26, compiled against API 36, Java 21 |
| Dependencies | kotlinx-coroutines, androidx.activity, Play app-update and review. No HTTP library. |

## Install

The library is on GitHub Packages, which asks for a GitHub token even to read a package. Create a token with only
`read:packages` and keep it out of your repository: put it in `~/.gradle/gradle.properties` or an environment
variable.

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://maven.pkg.github.com/aoneahsan/native-update")
            credentials {
                username = providers.gradleProperty("gpr.user").orNull ?: System.getenv("GITHUB_ACTOR")
                password = providers.gradleProperty("gpr.key").orNull ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.aoneahsan:native-update-android:1.2.0")
}
```

## Start it

Call `init` in `Application.onCreate`, before any screen reads an updated file. It runs the cold-start checks
there: integrity, rollback, new binary.

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        NativeUpdate.init(
            this,
            NativeUpdateConfig.Builder(
                serverUrl = "https://nativeupdatebe.aoneahsan.com/api",
                apiKey = BuildConfig.NATIVE_UPDATE_KEY,          // the app's nu_app_ key
                publicKey = BuildConfig.NATIVE_UPDATE_PUBLIC_KEY, // verifies every bundle
            ).build(),
        )
    }
}
```

Once the first screen is up and working, on every start:

```kotlin
NativeUpdate.notifyAppReady()
```

## Read updated files

Mirror your APK's asset paths inside the bundle: `config/flags.json` in the ZIP replaces
`assets/config/flags.json`. `file()` returns the updated copy, or `null` when the active bundle doesn't have it.

```kotlin
val flags = NativeUpdate.file("config/flags.json")?.readText()
    ?: assets.open("config/flags.json").bufferedReader().readText()
```

## Check and download

```kotlin
lifecycleScope.launch {
    when (val result = NativeUpdate.checkForUpdate()) {
        is UpdateCheckResult.Available -> NativeUpdate.download(result.info) // used from the next cold start
        is UpdateCheckResult.NativeUpdateRequired -> Unit // ask for a store update
        else -> Unit
    }
}
```

`download(info, Activation.NOW)` switches straight away instead. The default, `NEXT_START`, never changes files
under a screen that is already showing. From Java, every call is `@JvmStatic`; use `checkForUpdateAsync` and
`downloadAsync`, whose callbacks run on the main thread.

## Publish a bundle

```bash
npx native-update bundle sign ./bundle.zip --key ./private.pem
npx native-update deploy ./bundle.zip --app com.example.app --version 1.0.1 --payload-type assets --wait
```

`--payload-type assets` marks the ZIP as files. A Capacitor or React Native app is never offered it, and this
library is never offered a web bundle.

## What it guarantees

- **Integrity:** a bundle is used only after its SHA-256 matches and its RSA-SHA256 signature verifies with your
  public key. Both are checked again on every cold start. Signatures can only be turned off in a debuggable build.
- **Safety:** unpacking refuses any entry that escapes its folder (Zip-Slip) and anything over the size limits
  (100 MB download, 300 MB unpacked by default).
- **Rollback:** a new bundle that hasn't reached `notifyAppReady()` within two cold starts is rolled back, and
  that bundle is never offered to that device again.
- **New binary:** a store or sideload update retires bundles made for the older build.
- **Disk:** after a healthy start, only the active bundle, its rollback target and a staged download are kept.
- **Delta downloads (1.2.0+):** when the device runs a version the server still holds, it downloads a small `NUDELTA/1`
  patch and rebuilds the new bundle from the current one, then checks it exactly like a full download. Any problem
  falls back to the full download.

## Play in-app update and review

```kotlin
private val updateLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { }

lifecycleScope.launch { PlayAppUpdate.startImmediate(this@MainActivity, updateLauncher) }

override fun onResume() {
    super.onResume()
    lifecycleScope.launch { PlayAppUpdate.resumeIfInProgress(this@MainActivity, updateLauncher) }
}

if (PlayReview.shouldAsk(successes, lastAskedMs, System.currentTimeMillis())) {
    lifecycleScope.launch { PlayReview.request(this@MainActivity) }
}
```

Only the immediate update flow is offered: the flexible flow restarts the app the moment its download finishes.
A build installed from outside Google Play gets `NOT_PLAY_INSTALL`; send those people to your download page.

## Error codes

`NETWORK_ERROR` · `DOWNLOAD_ERROR` · `CHECKSUM_ERROR` · `SIGNATURE_ERROR` · `EXTRACTION_ERROR` · `INSECURE_URL` ·
`VALIDATION_ERROR` · `NOT_INITIALIZED`, on `NativeUpdateException.code`. Messages never contain file paths or keys.
