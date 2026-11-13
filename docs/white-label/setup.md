---
sidebar_position: 3
title: Setting up a white-label deployment
description: The steps from payment to your customers' first release on a white-labelled Native Update — the license email, domains and DNS, branding, the deploy and the license file.
keywords: [white label setup, native update deployment, custom domain ota server, white label onboarding]
last_update:
  date: 2026-11-13
  author: Native Update team
---

# Setting up a white-label deployment

1. **Pay on the pricing page.** Checkout runs on Polar for the exact total. When the payment is confirmed, the license
   email arrives with your license key and its certificate. The thank-you page says whether the payment went
   through; the email is the record.
2. **Confirm the details.** We write to confirm the domains, your logo, your product name and your colors. Send the
   logo as SVG if you have one.
3. **Point your DNS.** We send the records for the dashboard and update domains. They stay in your DNS, under your
   control.
4. **We deploy it.** The deployment carries your license key and serves the [license file](./verify) on each domain.
   You get the dashboard address.
5. **Your customers start.** They install `native-update`, set `serverUrl` to your update domain, and upload their
   first signed bundle. The [quick start](../getting-started/quick-start) applies unchanged, with your server in
   place of ours.

Your included months of updates count from the day you paid, not from the day the deployment went live.
