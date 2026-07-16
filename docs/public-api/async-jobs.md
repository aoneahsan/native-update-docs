---
sidebar_position: 3
title: Public API — Queued jobs
description: Uploads return 202 with a job id. How the job lifecycle works, how to poll it, and what happens when processing fails.
keywords: [native-update async jobs, 202 accepted, poll job status, ci deploy wait, ota build processing]
last_update:
  date: 2026-07-16
  author: Ahsan Mahmood
---

# Queued jobs

Uploading a bundle is slow work: the server hashes it, signs it with your app's
key, and stores it. Holding an HTTP request open for that would time out on a
large bundle over a slow link, so the public API **queues every upload** and
hands you a job to poll.

```
POST /apps/{app}/builds   →  202 Accepted
                             { job_id, status_url, build: { status: "processing" } }
                                     │
                                     ▼
GET /jobs/{job_id}        →  pending → processing → completed
                                                  └→ failed
```

## 202 means accepted, not live

This is the one thing to get right. A 202 says the server took your bundle. The
build exists immediately with status `processing`, and **devices never see it**
— update checks only serve `active` builds. It goes live when the job reports
`completed`.

So never treat a 202 as a successful release. Poll the job.

## Poll it

```bash
curl -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  https://nativeupdatebe.aoneahsan.com/api/public/v1/jobs/01hq2xk8…
```

```json
{ "data": {
  "id": "01hq2xk8vt9r3m4n5p6q7s8t9v",
  "type": "build.process",
  "status": "completed",
  "attempts": 1,
  "result": { "build_id": 42, "version": "1.2.0", "channel": "production",
              "status": "active", "checksum": "e3b0c442…", "file_size": 2438012 },
  "error": null,
  "queued_at": "2026-07-16T09:00:00+00:00",
  "started_at": "2026-07-16T09:00:03+00:00",
  "finished_at": "2026-07-16T09:00:12+00:00"
} }
```

| Status | Means | Do |
|---|---|---|
| `pending` | Queued, not started | Keep polling |
| `processing` | Being signed and stored | Keep polling |
| `completed` | **Live.** `result` holds the build | Stop — success |
| `failed` | Gave up after retries. `error` says why | Stop — fail the build |

Poll every ~5 seconds. Processing normally finishes in well under a minute; the
worker picks jobs up each minute, so allow a little slack before assuming
trouble. Stop at `completed` or `failed` — those are final.

## When it fails

A failing job retries **3 times** with backoff (60s, then 300s) — enough to ride
out a brief storage blip. If every attempt fails:

- the job goes `failed` and `error` explains why,
- the build is marked `failed` and **never becomes active**, so a broken release
  cannot reach devices,
- the app owner gets an email.

Fix the cause and upload again with the same version — a failed build does not
hold the version hostage.

## In CI

Use `--wait` and let the exit code speak:

```bash
export NATIVE_UPDATE_TOKEN=${{ secrets.NATIVE_UPDATE_TOKEN }}

npx native-update deploy ./dist \
  --app com.example.app \
  --version 1.2.0 \
  --wait
```

`--wait` polls until the job resolves, then exits 0 on `completed` and 1 on
`failed`. Without it the command exits as soon as the upload is accepted, and a
failed release would look like a green build.

Rolling your own? Mirror the same shape:

```bash
JOB=$(curl -sf -X POST -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
  -F "file=@./bundle.zip" -F "version=1.2.0" -F "channel=production" \
  "$NU/apps/com.example.app/builds" | jq -r '.data.job_id')

while :; do
  STATUS=$(curl -sf -H "Authorization: Bearer $NATIVE_UPDATE_TOKEN" \
    "$NU/jobs/$JOB" | jq -r '.data.status')
  case "$STATUS" in
    completed) echo "live"; break ;;
    failed)    echo "release failed"; exit 1 ;;
    *)         sleep 5 ;;
  esac
done
```

Give the loop a timeout. A job that never resolves should fail your pipeline, not
hang it.

## Visibility

A job is visible to any token that manages its app — not only the token that
created it. Rotating or replacing a token therefore never strands an in-flight
deploy. A job belonging to an app outside your token's list answers 404, like
every other out-of-scope resource.
