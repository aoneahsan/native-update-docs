---
sidebar_position: 5
title: Verify a white-label license
description: Every white-label deployment serves a license file at a fixed address. Anyone can check a license by its key or by the domain it runs on; verification is run by our licensing service.
keywords: [verify native update license, white label license file, well-known license json, license key check]
last_update:
  date: 2026-11-13
  author: Native Update team
---

# Verify a white-label license

Paste a license key or a domain into the [verify page](https://nativeupdate.aoneahsan.com/verify-license).
Verification is run by our licensing service.

## The license file

Every white-label deployment serves two files on each of its domains:

- `/.well-known/nativeupdate-white-label-license.json`
- `/.well-known/nativeupdate-white-label-license.pdf`, the public certificate

The JSON names the license, so a check by domain can find it:

```json
{
  "$schema": "native-update-white-label-license",
  "product": "Native Update",
  "publicKey": "NATIVEUPDATE-WL-…",
  "client": "Your company",
  "domain": "updates.your-company.com",
  "verifyUrl": "https://nativeupdate.aoneahsan.com/verify-license?key=NATIVEUPDATE-WL-…",
  "issuedAt": "…"
}
```

We add both files when we deploy; you don't need to.

## What a check shows

| By key | Meaning |
|---|---|
| Active license | The key is a live license |
| Issued, being set up | Paid for; the deployment is being set up |
| Revoked | The license no longer covers any domain |
| No license with this key | Check the key against the license email |

| By domain | Meaning |
|---|---|
| Licensed domain | The domain serves a valid license file |
| Licensed for another domain | The file names a license that doesn't cover this domain |
| No license file | Nothing at the address above |
| The domain didn't answer | It didn't respond over HTTPS in time |

A check shows only public details: the key, the client name, the domains, what the license covers and its dates.
Never an email address or a price.

## Inside the deployment

The deployment checks its own key once when it starts and again when it comes back to the front, never on a timer.
If the license is revoked or doesn't cover the domain, the dashboard shows "This license is not active" with a link
to the verify page. Nothing is deleted. If our service can't be reached, the deployment keeps running and checks
again on the next start.
