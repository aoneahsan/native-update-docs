---
sidebar_position: 2
title: Core — Config (PluginInitConfig)
description: Field-by-field reference for PluginInitConfig — the single configuration object passed to NativeUpdate.initialize() at app boot. Covers every flag across server, security, live-update, app-update, and review settings.
keywords: [PluginInitConfig, NativeUpdate.initialize, native-update config, capacitor update config, apiKey, publicKey]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Core — Config (`PluginInitConfig`)

`PluginInitConfig` is the configuration object passed to [`NativeUpdate.initialize()`](./lifecycle#initialize). It is the largest config in the plugin — 24 fields spanning server connectivity, security, live-update behaviour, app-update behaviour, and review fallback. Every field except `appId` is optional, but several are effectively required for a production setup (`serverUrl`, `apiKey`, `publicKey`).

```typescript
import type { PluginInitConfig } from 'native-update';
```

For feature-area-specific configs (`LiveUpdateConfig`, `AppUpdateConfig`, `AppReviewConfig`, `BackgroundUpdateConfig`, `SecurityConfig`), see their dedicated reference pages — they are usually composed inside this top-level config.

---

## Server & connection

### `appId`

| | |
|---|---|
| Type | `string` |
| Required | **yes** |
| Default | — |

Capacitor app ID (matches `capacitor.config.ts` → `appId`). The server uses this to scope which bundles a device is allowed to download.

### `serverUrl`

| | |
|---|---|
| Type | `string` |
| Required | yes for production |
| Default | — |

HTTPS origin of your update server. Plain HTTP is rejected at startup.

### `baseUrl`

| | |
|---|---|
| Type | `string` |
| Required | no |
| Default | falls back to `serverUrl` |

Override for the API base URL when it differs from the bundle-download URL (rare; useful when bundles are served from a separate CDN).

### `apiKey`

| | |
|---|---|
| Type | `string` |
| Required | yes (when using the hosted SaaS or a Laravel backend that enforces keys) |
| Default | — |

App-bound API key issued by the Native Update dashboard (or the Nova admin in a self-hosted backend). Sent as the `X-API-Key` header on every request to the backend.

:::warning Not persisted
As of v2 the plugin does **not** persist the API key across sessions — the host app must pass it on every `initialize()` call. Read it from your env or from secure storage and supply it explicitly.
:::

### `allowedHosts`

| | |
|---|---|
| Type | `string[]` |
| Required | no |
| Default | `[]` (every HTTPS host accepted) |

Allow-list of hostnames for bundle downloads. Non-empty values are matched against the host of every download URL; mismatches throw `INSECURE_URL`. Use this as a belt-and-braces guard against misconfigured `setUpdateUrl()` calls.

---

## Live update behaviour

These shorthand fields apply to live-update flows. They duplicate fields on [`LiveUpdateConfig`](../live-update/config) for ergonomic single-config initialisation. When both are set, the values inside the dedicated `liveUpdate` block (when present) take precedence.

### `channel`

| | |
|---|---|
| Type | `string` |
| Required | no |
| Default | `'production'` (server-side convention) |

Release channel the device tracks.

### `autoCheck`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

Enable automatic update checking on a fixed interval (set by `checkInterval`).

### `autoUpdate`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `true`, `sync()` automatically downloads updates instead of returning `UPDATE_AVAILABLE`.

### `updateStrategy`

| | |
|---|---|
| Type | `UpdateStrategy` |
| Required | no |
| Default | `'background'` |

How a `READY` bundle is applied. See [`UpdateStrategy`](../live-update/enums#updatestrategy).

### `requireSignature`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

Set `true` in production. See [`LiveUpdateConfig.requireSignature`](../live-update/config#requiresignature).

### `checksumAlgorithm`

| | |
|---|---|
| Type | `ChecksumAlgorithm` |
| Required | no |
| Default | `'SHA-256'` |

See [`ChecksumAlgorithm`](../live-update/enums#checksumalgorithm).

### `publicKey`

| | |
|---|---|
| Type | `string` (PEM-encoded) |
| Required | when `requireSignature: true` |
| Default | — |

Public key used to verify bundle signatures.

### `checkInterval`

| | |
|---|---|
| Type | `number` (**milliseconds**) |
| Required | no |
| Default | `0` |

:::warning Units differ across configs
`PluginInitConfig.checkInterval` is in **milliseconds**. `LiveUpdateConfig.checkInterval` and `BackgroundUpdateConfig.checkInterval` are both in **seconds**. The discrepancy is historical; mind the units.
:::

---

## Download tuning

### `maxBundleSize`

| | |
|---|---|
| Type | `number` (bytes) |
| Required | no |
| Default | `100 * 1024 * 1024` (100 MB) |

Hard cap on bundle size. Bundles larger than this throw `SIZE_LIMIT_EXCEEDED` regardless of platform caps.

### `downloadTimeout`

| | |
|---|---|
| Type | `number` (milliseconds) |
| Required | no |
| Default | `30_000` (30 s) |

Timeout for individual download requests.

### `retryAttempts`

| | |
|---|---|
| Type | `number` |
| Required | no |
| Default | `3` |

Number of retry attempts for failed downloads.

### `retryDelay`

| | |
|---|---|
| Type | `number` (milliseconds) |
| Required | no |
| Default | `1_000` (1 s) |

Delay between retry attempts.

### `cacheExpiration`

| | |
|---|---|
| Type | `number` (milliseconds) |
| Required | no |
| Default | `86_400_000` (24 h) |

How long downloaded-but-not-applied bundles are kept in the device cache before garbage collection.

---

## Security & validation

### `enableSignatureValidation`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `true` |

Master switch for signature validation. The more granular `requireSignature` (above) is the recommended way to control this; this field exists for backwards compatibility.

### `security`

| | |
|---|---|
| Type | [`SecurityConfig`](../security/overview) |
| Required | no |
| Default | `{ enforceHttps: true, validateInputs: true }` |

Nested security configuration. See [Security — Overview](../security/overview).

---

## Filesystem / preferences injection

### `filesystem`

| | |
|---|---|
| Type | `typeof Filesystem` from `@capacitor/filesystem` |
| Required | no (auto-detected) |
| Default | imported lazily |

Inject your `@capacitor/filesystem` instance to control which filesystem implementation the plugin uses. Useful for tests with a mock filesystem. Most apps leave this `undefined`.

### `preferences`

| | |
|---|---|
| Type | `typeof Preferences` from `@capacitor/preferences` |
| Required | no (auto-detected) |
| Default | imported lazily |

Same as `filesystem` but for `@capacitor/preferences` (used for plugin state persistence).

---

## Native app-update / review

### `appStoreId`

| | |
|---|---|
| Type | `string` |
| Required | yes for iOS App Update / App Review |
| Default | — |

Numeric App Store ID for the iOS binary. See [`AppUpdateConfig.appStoreId`](../app-update/config#appstoreid).

### `packageName`

| | |
|---|---|
| Type | `string` |
| Required | yes for Android App Update / App Review |
| Default | derived from `appId` |

Java-style package name. See [`AppUpdateConfig.packageName`](../app-update/config#packagename).

### `webReviewUrl`

| | |
|---|---|
| Type | `string` |
| Required | recommended for cross-platform coverage |
| Default | — |

Fallback review URL for platforms without a native in-app review API. See [`AppReviewConfig.webReviewUrl`](../app-review/config#webreviewurl).

---

## Logging

### `enableLogging`

| | |
|---|---|
| Type | `boolean` |
| Required | no |
| Default | `false` |

When `true`, the SDK emits structured debug logs through the configured logger. Pair with `SecurityConfig.logSecurityEvents` for security-specific events.

```typescript
enableLogging: import.meta.env.DEV
```

---

## Recommended production config

```typescript
import {
  NativeUpdate,
  UpdateStrategy,
  ChecksumAlgorithm,
} from 'native-update';

await NativeUpdate.initialize({
  // Identity
  appId: 'com.yourcompany.yourapp',
  appStoreId: '1234567890',
  packageName: 'com.yourcompany.yourapp',

  // Server
  serverUrl: 'https://updates.yourdomain.com',
  apiKey: import.meta.env.VITE_NATIVE_UPDATE_API_KEY,
  channel: 'production',
  allowedHosts: ['updates.yourdomain.com'],

  // Live update
  autoCheck: true,
  autoUpdate: false,
  updateStrategy: UpdateStrategy.BACKGROUND,
  checkInterval: 3_600_000,                          // ms (1 h)
  publicKey: import.meta.env.VITE_NATIVE_UPDATE_PUBLIC_KEY,
  requireSignature: true,
  checksumAlgorithm: ChecksumAlgorithm.SHA256,

  // Download tuning
  maxBundleSize: 50 * 1024 * 1024,                   // 50 MB
  downloadTimeout: 60_000,
  retryAttempts: 3,
  retryDelay: 2_000,
  cacheExpiration: 7 * 24 * 60 * 60 * 1000,          // 7 days

  // Security
  security: {
    enforceHttps: true,
    certificatePinning: {
      enabled: true,
      pins: [{ hostname: 'updates.yourdomain.com', sha256: ['ActivePin', 'BackupPin'] }],
    },
    logSecurityEvents: true,
  },

  // Review fallback
  webReviewUrl: 'https://apps.apple.com/app/id1234567890?action=write-review',

  // Logging
  enableLogging: false,
});
```

---

<div className="nu-author-card">
Config reference verified against <code>src/definitions.ts</code> in the plugin repo as of <strong>2026-05-11</strong>. Documented by <a href="https://aoneahsan.com">Ahsan Mahmood</a>.
</div>
