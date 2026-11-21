---
title: Access tokens and app keys
sidebar_label: Access tokens
description: The two kinds of Native Update credential. An nu_app_ key ships inside your app and only checks for updates; an nu_pat_ access token manages your own apps through the API and never leaves your server or CI.
tags: [developers, api, access tokens, app keys, security]
keywords: [nu_pat_ token, nu_app_ key, native-update access token, native-update api key, ci token capacitor ota]
last_update:
  date: 2026-11-22
  author: Native Update team
---

# Access tokens and app keys

**Native Update has two credentials and they never stand in for each other.** An app key (`nu_app_…`) belongs to one app and ships inside it, so the plugin can ask for updates. An access token (`nu_pat_…`) belongs to you and manages your apps through the [Public Management API](/developers/api) from CI, a script or a server.

| | App key | Access token |
|---|---|---|
| Looks like | `nu_app_…` | `nu_pat_…` |
| Belongs to | One app | You |
| Used by | The plugin inside your app | CI, scripts, your server |
| Calls | `/api/v1/updates/check` and the other device routes | `/api/public/v1/*` |
| Can be locked to a client | Yes: [web origins, Android package and signing certificate, iOS bundle id](/how-to/restrict-api-keys) | No |
| Safe inside an app or a browser | Yes, once restricted | Never |

## Make an access token {#make}

1. In the dashboard, open **Access tokens** in the Developer area and choose **New token**.
2. Name it after where it will live, for example `GitHub Actions — checkout app`.
3. Pick its reach: tick the apps it may manage, or turn on **All apps** to cover every app you own now and later.
4. Leave the delete permissions off unless the job really deletes. See [Delete permissions](#delete-permissions).
5. Copy the token into your CI secrets. We email you that it was made.

Making a token shows it on screen, so it needs a sign-in from the last 10 minutes, and a code from your authenticator app when [two-step sign-in](/developers/two-step-sign-in) is on.

## What a token reaches {#reach}

A token reaches the apps **you own**. Apps you work on through a team stay out of its reach; their owner makes a token for them. Anything outside its reach answers `404`, never `403`, so the API cannot be used to find out whether someone else's app exists. `GET /token` tells a script exactly which apps it has:

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/token
```

Every token may read, create and edit apps, upload, publish, promote and roll out builds, make, rotate and restrict app keys, manage the signing key and back up a keystore. Making, rotating and deleting tokens themselves stays in the dashboard: no token can make another token.

## Delete permissions {#delete-permissions}

Three permissions are off until you tick them, so a leaked CI token can ship a release but cannot erase one:

| Permission | Allows |
|---|---|
| `builds.delete` | `DELETE /apps/{app}/builds/{build}` |
| `apps.delete` | `DELETE /apps/{app}`, with its builds and keys |
| `keys.delete` | `DELETE /apps/{app}/api-keys/{key}` |

Without the matching permission, the delete answers `403` with the code `TOKEN_PERMISSION_DENIED`, and `details.required_permission` names the one to tick.

## Showing a secret again: the 10-minute rule {#ten-minute-rule}

You can show a token, or an app key, again from the dashboard, so losing one does not force a rotation. Native Update shows it only when:

- you signed in with Google **in the last 10 minutes**, and
- when two-step sign-in is on, you entered a **code from your authenticator app** during that sign-in.

A remembered browser is not a code, and a recovery code is not enough either: a recovery code gets you into the dashboard, but showing a secret still asks for a code from the authenticator. Outside those 10 minutes the dashboard asks you to sign in again and brings you straight back.

The same rule covers making a token, rotating one and adding a webhook address, because each puts a new secret on screen. A token made before recoverable storage has no copy to show; rotate it and store the new one.

## Rotate, revoke or delete {#rotate}

- **Rotate** gives the token a new secret. The old secret stops working at once.
- **Revoke** stops the token at once and keeps its row, so you can still see what it was.
- **Delete** removes it. A revoked or deleted token frees its place on your plan.

An app key rotated in the dashboard or through `POST /apps/{app}/api-keys/{key}/rotate` returns the new key in that answer, and the old key stops working at once. A revoked app key stops working at once too, so update checks that send it get `401`. To change the key a released app sends without a gap, make a second key, ship it in a store release, then revoke the first.
