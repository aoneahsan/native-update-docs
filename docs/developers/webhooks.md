---
title: Webhooks
description: Native Update sends a signed POST to your own server each time a build, an app or an app key changes. Every event with a sample payload, signature checks in Node and PHP, retries, pausing and the addresses that are refused.
tags: [developers, webhooks, standard webhooks]
keywords: [native-update webhooks, ota webhook, build rolled out webhook, standard webhooks verify node, standard webhooks verify php]
last_update:
  date: 2026-11-22
  author: Native Update team
---

# Webhooks

**A webhook is a signed `POST` Native Update sends to your server each time something you picked happens:** a bundle arrives, a rollout widens or pauses, an app key is revoked. Your server checks the signature, answers `2xx`, and does whatever comes next: a message in `#releases`, a ticket, a dashboard of your own.

## Add an address {#add}

1. In the dashboard, open **Webhooks** in the Developer area and choose **Add an address**.
2. Enter your server's `https://` address and an optional note, like "posts to #releases".
3. Pick at least one event.
4. Copy the signing secret (`whsec_…`) into your server's settings. We email you that the address was added.
5. Press **Send a test**. The answer shows in the delivery log.

Adding an address shows a secret on screen, so it needs a sign-in from the last 10 minutes, and a code from your authenticator app when [two-step sign-in](/developers/two-step-sign-in) is on. Showing the secret again later follows the same rule.

## The request {#request}

Every request is `POST`, `content-type: application/json`, `user-agent: NativeUpdate-Webhooks/1.0`, with the three [Standard Webhooks](https://www.standardwebhooks.com) headers:

| Header | Holds |
|---|---|
| `webhook-id` | The event's id, like `msg_2LJlAeVbqWVuJ7mH0u3SxZ5X`. It stays the same on every retry and on **Send again**, so use it to ignore a repeat. |
| `webhook-timestamp` | When this attempt was sent, in Unix seconds. |
| `webhook-signature` | `v1,` and a base64 HMAC-SHA256 of `id.timestamp.body`. For 24 hours after you make a new secret it holds two entries, one per secret, separated by a space. |

The body is always the same three fields. `data` carries only the fields listed for that kind of thing; a new column in our database never reaches your server by accident.

```json
{ "type": "build.rolled_out", "timestamp": "2026-11-21T09:30:00Z", "data": { "id": 1842, "version": "4.2.1" } }
```

## Check the signature {#verify}

Check it against the **raw** body, exactly as it arrived, before any JSON parsing. Refuse a timestamp more than 5 minutes from your clock, so a captured request cannot be replayed later. Any [Standard Webhooks library](https://github.com/standard-webhooks/standard-webhooks) accepts the `whsec_` secret unchanged; the two below need nothing installed.

### Node {#verify-node}

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Returns true when the request carries a valid Native Update signature. */
export function verifyNativeUpdate(rawBody, headers, secret, toleranceSeconds = 300, now = Date.now()) {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatures = headers['webhook-signature'];
  if (!id || !timestamp || !signatures) return false;

  const age = Math.abs(Math.floor(now / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signatures.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
```

With Express, read the body raw on that one route: `app.post('/hooks/native-update', express.raw({ type: 'application/json' }), …)` and pass `req.body.toString('utf8')`.

### PHP {#verify-php}

```php
<?php

/** True when the request carries a valid Native Update signature. */
function verify_native_update(string $rawBody, array $headers, string $secret, int $tolerance = 300, ?int $now = null): bool
{
    $id = $headers['webhook-id'] ?? '';
    $timestamp = $headers['webhook-timestamp'] ?? '';
    $signatures = $headers['webhook-signature'] ?? '';
    if ($id === '' || $timestamp === '' || $signatures === '' || ! ctype_digit($timestamp)) {
        return false;
    }
    if (abs(($now ?? time()) - (int) $timestamp) > $tolerance) {
        return false;
    }

    $key = base64_decode(substr($secret, strlen('whsec_')), true);
    if ($key === false) {
        return false;
    }
    $expected = base64_encode(hash_hmac('sha256', $id.'.'.$timestamp.'.'.$rawBody, $key, true));

    foreach (explode(' ', $signatures) as $entry) {
        [$version, $value] = array_pad(explode(',', $entry, 2), 2, '');
        if ($version === 'v1' && hash_equals($expected, $value)) {
            return true;
        }
    }

    return false;
}
```

Call it with `file_get_contents('php://input')` and the headers in lower case: `array_change_key_case(getallheaders())`. In Laravel, `$request->getContent()` and `$request->header('webhook-id')`.

### Check your code against a known answer {#test-vector}

Both functions above return `true` for this request, which Native Update's own signer produced. The secret is the public test secret from the Standard Webhooks specification, never a real one. Pass `now` as `1795253400000` in Node or `1795253400` in PHP, because the timestamp is in the past.

| | |
|---|---|
| Secret | `whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw` |
| `webhook-id` | `msg_2LJlAeVbqWVuJ7mH0u3SxZ5X` |
| `webhook-timestamp` | `1795253400` |
| `webhook-signature` | `v1,gf0AyTWi1a0jE8qqq3UehYGYB+rSErV+FnUry1JzDCs=` |

Body, byte for byte:

```json
{"type":"webhook.test","timestamp":"2026-11-21T09:30:00Z","data":{"address":"wh_k3v9q2m8x1p7r4tz","message":"A test from Native Update. Your server checked its signature if it answers 2xx."}}
```

Change one character of the body and both must return `false`.

## Every event {#events}

Each sample is a full body. Ids, dates and counts are examples.

### `build.uploaded` {#build-uploaded}

A bundle arrived and its checks started. A bundle checked straight away also sends `build.rolled_out` next.

```json
{
  "type": "build.uploaded",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1842,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.1",
    "channel": "staging",
    "status": "processing",
    "rollout_percentage": 100,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 0,
    "install_count": 0,
    "rollback_count": 0,
    "promoted_from_id": null,
    "created_at": "2026-11-21T09:28:41+00:00"
  }
}
```

### `build.rolled_out` {#build-rolled-out}

A bundle passed its checks and devices on its channel can get it.

```json
{
  "type": "build.rolled_out",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1842,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.1",
    "channel": "staging",
    "status": "active",
    "rollout_percentage": 100,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 0,
    "install_count": 0,
    "rollback_count": 0,
    "promoted_from_id": null,
    "created_at": "2026-11-21T09:28:41+00:00"
  }
}
```

### `build.failed` {#build-failed}

A bundle failed its checks, for example a signature that does not match.

```json
{
  "type": "build.failed",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1844,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.2",
    "channel": "staging",
    "status": "failed",
    "rollout_percentage": 100,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 0,
    "install_count": 0,
    "rollback_count": 0,
    "promoted_from_id": null,
    "created_at": "2026-11-21T09:28:41+00:00"
  }
}
```

### `build.promoted` {#build-promoted}

A build was copied to another channel. `data` is the new build; `promoted_from_id` is the one it came from.

```json
{
  "type": "build.promoted",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1843,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.1",
    "channel": "production",
    "status": "active",
    "rollout_percentage": 100,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 0,
    "install_count": 0,
    "rollback_count": 0,
    "promoted_from_id": 1842,
    "created_at": "2026-11-21T10:02:17+00:00"
  }
}
```

### `build.rollout_changed` {#build-rollout-changed}

A rollout was widened, narrowed, paused or resumed, by a person or by the automatic pause after failed starts. A pause shows as `status: "paused"`.

```json
{
  "type": "build.rollout_changed",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1843,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.1",
    "channel": "production",
    "status": "active",
    "rollout_percentage": 40,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 318,
    "install_count": 301,
    "rollback_count": 2,
    "promoted_from_id": 1842,
    "created_at": "2026-11-21T10:02:17+00:00"
  }
}
```

### `build.deleted` {#build-deleted}

A build was deleted. `data` is the build as it was.

```json
{
  "type": "build.deleted",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 1844,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "version": "4.2.2",
    "channel": "staging",
    "status": "failed",
    "rollout_percentage": 100,
    "mandatory": false,
    "payload_type": "web_bundle",
    "file_size": 2481337,
    "download_count": 0,
    "install_count": 0,
    "rollback_count": 0,
    "promoted_from_id": null,
    "created_at": "2026-11-21T09:28:41+00:00"
  }
}
```

### `app.created` {#app-created}

An app was created.

```json
{
  "type": "app.created",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "name": "Checkout",
    "bundle_id": "com.example.checkout",
    "description": "Customer checkout app",
    "platform": "both",
    "channels": [
      "production",
      "staging"
    ],
    "created_at": "2026-11-21T09:12:05+00:00"
  }
}
```

### `app.deleted` {#app-deleted}

An app was deleted with its builds and keys. No separate `build.deleted` or key event is sent for them.

```json
{
  "type": "app.deleted",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "name": "Checkout",
    "bundle_id": "com.example.checkout",
    "description": "Customer checkout app",
    "platform": "both",
    "channels": [
      "production",
      "staging"
    ],
    "created_at": "2026-11-21T09:12:05+00:00"
  }
}
```

### `api_key.created` {#api-key-created}

An `nu_app_` key was made for an app. The key itself is never in a webhook.

```json
{
  "type": "api_key.created",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 311,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "name": "Production app key",
    "key_preview": "nu_app_9f2c41d07ab3e...",
    "status": "active",
    "restrictions": null,
    "last_used_at": null,
    "created_at": "2026-11-21T09:14:52+00:00"
  }
}
```

### `api_key.rotated` {#api-key-rotated}

An app key was given a new secret. The old secret stopped working at once; `key_preview` is the new one's start.

```json
{
  "type": "api_key.rotated",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 311,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "name": "Production app key",
    "key_preview": "nu_app_4b7e90c2f15da...",
    "status": "active",
    "restrictions": null,
    "last_used_at": null,
    "created_at": "2026-11-21T09:14:52+00:00"
  }
}
```

### `api_key.revoked` {#api-key-revoked}

An app key was revoked and stopped working at once.

```json
{
  "type": "api_key.revoked",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "id": 311,
    "app_id": "3f6c2a91-8d4e-4b7a-9c15-62e0d7a4b8f3",
    "name": "Production app key",
    "key_preview": "nu_app_9f2c41d07ab3e...",
    "status": "revoked",
    "restrictions": null,
    "last_used_at": "2026-11-21T11:40:03+00:00",
    "created_at": "2026-11-21T09:14:52+00:00"
  }
}
```

### `webhook.test` {#webhook-test}

Sent only when you press **Send a test**, to that one address.

```json
{
  "type": "webhook.test",
  "timestamp": "2026-11-21T09:30:00Z",
  "data": {
    "address": "wh_k3v9q2m8x1p7r4tz",
    "message": "A test from Native Update. Your server checked its signature if it answers 2xx."
  }
}
```

## Answers, retries and turning off {#retries}

- **Delivered:** any `2xx` answer within 10 seconds.
- **A failure:** anything else, including a redirect, which is never followed. Native Update keeps only the status and the first 4 KB of your answer, never its headers.
- **Retries:** 8 attempts in all, the first at once, then after 5 seconds, 5 minutes, 30 minutes, 2 hours, 5 hours, 10 hours and 10 hours. Every attempt carries the same `webhook-id`.
- **`410 Gone`** turns the address off at once.
- **Five days of failures** in a row turn the address off. Either way we email you, with the last answer and how many events were not sent.

**Turn back on** checks the address again and sends new events. Events from while it was off are in the delivery log, where **Send again** sends any one of them with its original `webhook-id`.

## Pause {#pause}

**Pause** stops sending without removing the address. Events that happen while it is paused are recorded in the log as **skipped** and are not sent; after **Resume**, send any of them again from the log. A paused or turned-off address still counts toward your plan's webhook addresses.

## A new signing secret {#rotate}

**Make a new secret** gives the address a new `whsec_…`. For the next 24 hours each request carries two signatures, one per secret, so you can switch your server over without missing one. After that only the new secret signs.

## Addresses that are refused {#refused}

Native Update checks the address when you add it and again before every send, then connects only to the addresses it checked:

- `https://` only, on port 443 or 8443, at most 2,048 characters.
- No user name or password inside the address. Check requests with the signing secret instead.
- No address on a local or private network: loopback, private ranges, link-local (cloud metadata), carrier-grade NAT, documentation and multicast ranges, IPv4 hidden inside IPv6, and numeric host forms such as `2130706433`. A host name is refused when any address it resolves to is one of those.
- None of Native Update's own hosts, and no `localhost`, `.local` or `.internal` names.

A refused send counts as a failure and nothing is read from that address.

## The delivery log {#log}

The **Webhooks** page shows the last 50 requests, filtered by address and result (delivered, failed, waiting, skipped), each with the body sent, the status your server answered, the time it took and the next attempt. Logs are kept for 30 days.
