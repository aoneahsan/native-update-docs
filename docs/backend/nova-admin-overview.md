---
sidebar_position: 5
title: Nova Admin Overview
description: A guided tour of the Laravel Nova admin panel that ships with the native-update backend. Five resources (User, App, Build, ApiKey, SigningKey), ten admin Actions, two groups, and the policy gates that scope each one.
keywords: [native-update nova admin, laravel nova ota dashboard, native-update admin panel, nova resources native update, nova actions native update]
last_update:
  date: 2026-05-11
  author: Ahsan Mahmood
---

# Nova Admin Overview

The `backend/` Laravel application ships with a Laravel Nova 5 admin panel mounted at `/admin`. It is the operator's surface for support, billing, and incident response — not the customer-facing dashboard. This page tours every resource and Action so you know what each lever does before pulling it in anger.

The panel uses Firebase ID-token auth like the rest of the dashboard, plus an admin-claim check (`ADMIN_EMAILS` allowlist). Tenant-scoped users see only their own rows; users on the admin allowlist see everything. The "see everything" pattern is implemented as `before` hooks on each Nova policy, so a misconfigured policy fails closed (denied) by default.

## Resource groups

Nova organises resources into two left-sidebar groups:

**Content** carries the business objects — Apps and Builds. This is where most support work happens: "did this customer's build upload?", "is the bundle marked active?", "what's the rollout percentage?".

**Security** carries the credentials — ApiKeys and SigningKeys. Lock-down operations live here: "revoke this leaked key", "rotate this app's signing keypair".

Users live in the default group at the top of the sidebar.

## Resource: User

Maps to the `users` table. One row per Firebase UID.

**Search fields:** email, name. Nova's global search hits both — type a user's email in the top bar and the relevant row surfaces immediately.

**Fields:**

`ID`, `Name`, `Email`, `Firebase UID` (the join key between Firebase Auth and the database — read-only), `Plan` (Select: `free` / `pro` / `enterprise`), computed `Apps Count` / `MAU Limit` / `Apps Limit` based on the plan.

`Is Active` (Boolean) — soft-deactivation. When false, dashboard logins still succeed but the user's apps stop serving updates. Used when offboarding a customer without wiping data.

`Is Suspended` (Boolean) + `Suspension Reason` (Text) + `Suspended At` (DateTime) — the panic button. When `is_suspended` is true, every API call by every key on this user's apps returns `403 USER_SUSPENDED`. Set via the `SuspendUser` Action, never edited by hand.

`Custom MAU Limit` / `Custom Apps Limit` (Number, both nullable) — overrides the plan's defaults. Useful for enterprise customers on a custom contract. Set via the `SetCustomLimits` Action.

`License Key` / `License Expires At` / `License Notes` — for the self-host model. Carrying a valid key lets a self-hosted customer use the licensed Nova-only features (the SaaS doesn't use this).

`Has Apps` (computed Boolean) and license-status badges (Active / Inactive / Suspended / No License / Expired / Valid) — at-a-glance status from the index.

**Relationships:** `Apps` (HasMany).

**Actions:** `Suspend User`, `Unsuspend User`, `Assign License`, `Set Custom Limits`. All four guarded by `canSee(isAdmin)` so non-admin operators don't see the buttons.

**When to come here:** customer reports an incident → search by email → look at suspension status, license, plan, custom limits → drill into their Apps relationship to see what's deployed.

## Resource: App

Maps to the `apps` table. One row per customer app (a customer can have many).

**Search fields:** name, app_id (the reverse-DNS string).

**Fields:**

`ID`, `User` (BelongsTo — the owner), `Name`, `App ID` (the reverse-DNS string like `com.example.app`), computed `Builds` / `API Keys` counters, `Platforms` (Code field — JSON array, e.g. `["ios","android"]`), `Channels` (Code field — JSON array, e.g. `["production","staging","beta"]`), `Created At`, `Updated At`.

**Relationships:** `Builds` (HasMany), `API Keys` (HasMany — labelled "API Keys", model `ApiKey`).

**Actions:** none directly — App-level operations live on the child resources (Build / ApiKey / SigningKey).

**When to come here:** verifying a customer's app is set up correctly, checking which channels they've published to, or drilling into the related builds and API keys.

## Resource: Build

Maps to the `builds` table. One row per uploaded bundle. The most operationally active resource — every release becomes a Build row.

**Search fields:** version, bundle_id, release_notes.

**Fields:**

`ID`, `App` (BelongsTo), `Version` (SemVer string), `Build Number` (Number — monotonic integer per app), `Bundle ID` (UUID — the value returned to the SDK as `bundleId`).

`Channel` (Select — `production` / `staging` / `beta` / `canary` / custom). `Platform` (Select — `all` / `ios` / `android` / `web`). When `all`, the build is served to every platform; otherwise the API filters per-device.

`Storage Provider` (Text — `local` / `s3` / `r2` / `drive` / `fileshub`), `File Size` (Text — human-formatted), `Checksum` (Text — SHA-256 hex, read-only), `FilesHub ID` (Text — when stored on FilesHub), `Google Drive ID` (Text — when stored on Drive).

`Mandatory` (Boolean — when true the SDK auto-applies on next launch), `Min Native Version` (Text — SemVer string, gates against the device's app-store binary version), `Rollout Percentage` (Number 0–100 — drives staged rollouts).

`Is Active` (Boolean — when false, the build is excluded from update checks even if it's the newest for the channel), `Is Archived` (Boolean — soft-delete flag; archived builds stay in the table but never serve), `Release Notes` (Text — surfaced to in-app update prompts).

Read-only counters: `Downloads`, `Installs`, `Rollbacks` — incremented by the analytics endpoints. Useful for spotting bad bundles fast: a high rollback-to-install ratio means devices are bouncing off the new bundle.

**Actions:** `Activate Build` (flip `is_active` true), `Archive Build` (flip `is_archived` true, removes from update flow without deleting metadata).

**When to come here:** support says "version 1.4.0 isn't shipping to customers" → search by version → confirm `is_active=true`, `is_archived=false`, channel matches, platform matches, rollout_percentage is high enough, `min_native_version` isn't blocking. Or: rollback alarms triggered → check counters, drop rollout to 0 with the dashboard's rollout endpoint, then `Archive Build` here.

## Resource: ApiKey

Maps to the `api_keys` table. One row per mobile-app-side API key.

**Search fields:** name, key_prefix (the first 12 chars, displayed to operators).

**Fields:**

`ID`, `App` (BelongsTo), `Name` (human label like "Production iOS"), `Key Prefix` (Text — read-only, e.g. `nu_prod_abc1`; **the full key is never persisted in plaintext** — only the bcrypt of it lives in `key_hash`).

`Type` (Select — `production` / `development`). `Rate Limit` (Number — requests per 15-min window, default 600). `Permissions` (Code — JSON array of allowed actions; reserved for future per-key scoping).

`Last Used` (DateTime — bumped by the auth middleware on every successful auth). `Expires At` (DateTime, nullable). `Created At`.

**Computed status badges:** Revoked, Deprecated, Expired, Active.

**Actions:** `Revoke API Key` (immediate hard-reject — sets `revoked_at`), `Deprecate API Key` (soft-rotate — sets `deprecated_at`; key still works but middleware logs a warning per request, letting you push customers to rotate before flipping to revoke).

**When to come here:** customer reports a leaked key → find by `key_prefix` → `Revoke API Key`. Or: rotating keys before an audit → `Deprecate` the old one, generate a new one in the customer dashboard, wait a release cycle, then `Revoke` the deprecated one.

## Resource: SigningKey

Maps to the `signing_keys` table. One row per app-level signing keypair.

**Search fields:** name, key_id (the SHA-256 fingerprint).

**Fields:**

`ID`, `App` (BelongsTo), `Name` (human label like "Production 2026 Q2"), `Key ID (Fingerprint)` (Text — SHA-256 of the public key SPKI, used to identify the key in audit logs).

`Public Key` (Code field — PEM-encoded SPKI; safe to show to operators). **The private key is never exposed in Nova.** It lives in `private_key_encrypted` using Laravel's encryption-at-rest; even the database operator can't read it without `APP_KEY`. The dashboard sign endpoint loads, decrypts, signs, and discards in-memory.

`Rotated At` / `Created At` / `Revoked At`. A revoked key cannot be used to sign new bundles; existing signed bundles remain verifiable.

**Actions:** `Rotate Signing Key` (generates a new keypair under the same App, sets `rotated_at` on the previous one), `Revoke Signing Key` (panic button when the private key leaks — invalidates all bundles signed by it; customers must re-sign and re-upload).

**When to come here:** scheduled key rotation (typically yearly) → `Rotate Signing Key` → customer downloads the new public key from the dashboard → ships a store build with the new key → at next release, the new keypair signs the bundle. Or: leak incident → `Revoke Signing Key` → coordinate emergency app-store release.

## Actions reference

Ten Nova Actions ship in `app/Nova/Actions/`:

| Action | Resource | What it does |
|---|---|---|
| `ActivateBuild` | Build | Flip `is_active=true`. Build re-enters the update flow if it's the newest for its channel. |
| `ArchiveBuild` | Build | Flip `is_archived=true`. Build leaves the update flow but stays in the database for audit. |
| `AssignLicense` | User | Generate or set a license key + expiry on a self-host customer's row. |
| `DeprecateApiKey` | ApiKey | Soft-rotate. Key still works; middleware logs a deprecation warning per request. |
| `RevokeApiKey` | ApiKey | Immediate hard-reject. Returns `401 INVALID_API_KEY` on every subsequent request. |
| `RevokeSigningKey` | SigningKey | Mark the signing key as revoked. Existing-signed bundles still verify; can't sign new ones. |
| `RotateSigningKey` | SigningKey | Generate a fresh keypair under the same App, marking the previous one as rotated. |
| `SetCustomLimits` | User | Override the plan's MAU + apps limits for an enterprise contract. |
| `SuspendUser` | User | Hard-block the user. Every API call by every key on their apps returns `403`. |
| `UnsuspendUser` | User | Lift a suspension. |

Each Action class extends Nova's `Action`. The destructive ones (`Suspend`, `Revoke`, `Archive`) carry confirmation text and an audit-log write so an unexpected click leaves a trail.

## Policy gates

Every Nova resource has a Policy class in `app/Policies/`:

`AppPolicy` scopes the index, view, update, and destroy actions to `app.user_id == auth()->id()` — except for admin users (allowlisted via `ADMIN_EMAILS`) who bypass scoping via a `before` hook. The same `before` pattern repeats on `UserPolicy`, `BuildPolicy`, `ApiKeyPolicy`, `SigningKeyPolicy`. **The bypass is opt-in admin, not opt-out tenant** — a misconfigured policy fails closed.

`AuthServiceProvider` explicitly registers all five policies via `Gate::policy()`. Don't rely on Laravel's auto-discovery here — the explicit registration is intentional and survives `php artisan optimize`.

The `User` resource itself also wraps the admin-control panels (`Admin Controls`, `License Management`) and their four Actions (`SuspendUser`, `UnsuspendUser`, `AssignLicense`, `SetCustomLimits`) in `canSee(isAdmin)` so non-admin operators don't see them at all. Defence-in-depth: even if a non-admin somehow opened the Action URL directly, the Action class double-checks `auth()->user()->isAdmin()`.

## Dashboards and Filters

Two custom Dashboards live in `app/Nova/Dashboards/` and surface in the Nova landing page — top-level counters (total apps, builds, MAU) and per-day download trend. They are intentionally simple; deep analytics live in the customer-facing dashboard, not Nova.

Filters under `app/Nova/Filters/` add the dropdowns above each resource index — channel filter on Builds, plan filter on Users, type filter on ApiKeys.

## What Nova is NOT for

Customer-facing dashboards live in the `website/` directory's React app, not in Nova. Customers do not log into Nova; they log into the React dashboard at `https://nativeupdate.aoneahsan.com` (or your equivalent), which calls the `/api/dashboard/*` endpoints.

Bulk data exports are not implemented in Nova. For tax / accounting / GDPR exports, query the database directly or write a one-off Artisan command.

CI / release automation does not go through Nova. The dashboard React app + the SDK CLI handle uploads programmatically — operators only touch Nova for support and incident response.

## Authored by

[Ahsan Mahmood](/about-the-author) — author and maintainer of `native-update`.
