---
sidebar_position: 2
title: Jobs page
description: Every slow piece of work in the dashboard runs as a job — bundle processing, release notes drafts and docs assistant answers. The Jobs page shows each one's status, attempts and errors.
keywords: [native-update jobs, bundle processing status, queued upload, ota upload failed]
last_update:
  date: 2026-10-27
  author: Native Update team
---

# Jobs page

**Dashboard → Jobs.** Work that takes longer than a request runs as a job, so the page never hangs while it
happens. Three kinds show here:

- **Bundle processing** — every uploaded bundle: checksum, signature and delta patches.
- **Release notes draft** — a run of the [release notes writer](./ai-assistants#release-notes-writer).
- **Docs assistant answer** — a question to the [docs assistant](./ai-assistants#docs-assistant).

Each row shows its status (*queued*, *running*, *succeeded* or *failed*), its attempts and a link to the release
it belongs to. Filter by status at the top.

A failed job says why on its row. A bundle whose processing failed never goes live: devices only receive releases
whose job succeeded.

The same jobs are readable from CI through the public API — see [Async jobs](../public-api/async-jobs).
