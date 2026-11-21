---
title: Two-step sign-in
description: Turn on two-step sign-in for your Native Update account, keep ten recovery codes, remember a browser for 7 days if you choose, and see what still asks for a code. Covers the dashboard and the Nova admin panel.
tags: [developers, security, two-step sign-in, 2fa]
keywords: [native-update two-step sign-in, native-update 2fa, authenticator app native update, recovery codes, remember this browser]
last_update:
  date: 2026-11-22
  author: Native Update team
---

# Two-step sign-in

**Two-step sign-in adds a 6-digit code from an app on your phone after Google.** Someone who gets into your Google account still cannot ship a release, change a rollout or read a key. Every account can turn it on, on every plan, in the dashboard under **Settings → Security**.

## Turn it on {#turn-on}

1. Open **Settings → Security** and choose **Turn on two-step sign-in**. This needs a sign-in from the last 10 minutes.
2. Scan the QR code with Google Authenticator, 1Password, Aegis, Authy or any app that makes time-based 6-digit codes. Can't scan it? Type the key instead; the account name is Native Update.
3. Enter the code the app shows now, to check it works.
4. Save the ten recovery codes, then tick that you saved them. They are not shown again.

From the next sign-in on, Google is followed by **Two-step sign-in**: enter the code your app shows.

## Recovery codes {#recovery-codes}

You get ten, each like `k7m2p-x9qr4`, and each works once. If your phone is lost or reset, one of them lets you in instead of a code, and we email you how many are left. **Settings → Security** shows the count; make new ones while you still have the phone, which needs a code from it and stops the old ones at once.

A recovery code trusts that one sign-in only. It opens the dashboard and **Move to a new phone**, but not a secret: showing a token, an app key or a webhook signing secret still asks for a code from your authenticator app. So after a lost phone, move to the new one first.

## Remember this browser {#remember}

When you enter a code you can tick **Remember this browser for 7 days**. It is unticked unless you tick it. That browser then skips the code for your account, and only yours, until the 7 days are up; it is never renewed in between. **Settings → Security → Remembered browsers** lists each one with **Forget**, and **Forget every browser** clears them all.

A remembered browser is not a code. Anything that shows a secret still asks for one.

## What always asks for a code {#always}

With two-step sign-in on, these need a sign-in from the last 10 minutes **and** a code from your authenticator app entered during that sign-in:

- making, showing again or rotating an access token ([access tokens](/developers/access-tokens#ten-minute-rule));
- showing an `nu_app_` key again;
- adding a webhook address, or showing or remaking its signing secret ([webhooks](/developers/webhooks));
- making new recovery codes, and turning two-step sign-in off.

Moving to a new phone accepts a code or a recovery code from that sign-in. Five wrong codes pause code entry for 15 minutes.

## Platform admins {#admins}

Platform admins always use two-step sign-in and cannot turn it off. In the dashboard, a remembered browser never opens the admin area: every admin sign-in asks for a code.

The Nova admin panel asks too. After Google, it asks for a code from the authenticator app or a recovery code, and offers the same unticked **Remember this browser for 7 days**. Showing a secret or resetting someone's two-step sign-in still asks for a code. An admin who has not set up two-step sign-in turns it on in the dashboard first.

## Sessions and sign-ins {#sessions}

**Settings → Security** also lists where you are signed in now, with **Sign out everywhere else**, and the last ten sign-ins with how each one passed the second step. Signing out other sessions does not touch access tokens, AI connections or webhooks; revoke those on their own pages.

Turning two-step sign-in off removes your recovery codes and remembered browsers, and showing a key again then needs only a recent sign-in.
