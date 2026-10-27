---
sidebar_position: 1
title: AI assistants and Speak
description: The two dashboard assistants. The release notes writer drafts a release's notes and changelog from what you type or say; the docs assistant answers setup questions from these docs and names the page it used.
keywords: [native-update ai, release notes writer, docs assistant, speak, ota release notes]
last_update:
  date: 2026-10-27
  author: Native Update team
---

# AI assistants and Speak

The dashboard has two assistants under **Assistants** in the sidebar. Both take typed text or your voice.

## Release notes writer

**Dashboard → Assistants → Release notes.**

1. Pick the app and the release. The writer needs an uploaded bundle; with none, the page links to **Upload bundle**.
2. Say what changed. Type it (up to 4,000 characters), or press **Speak** and say it.
3. Press **Draft release notes**. The draft has a title, a one-line summary and a changelog, each entry tagged
   *added*, *changed*, *fixed* or *security*.
4. Edit the draft, then save it. It becomes that release's notes.

The writer only lists changes you stated. It does not invent features.

## Docs assistant

**Dashboard → Assistants → Docs assistant.** Ask a setup question, typed or spoken. The answer is drawn from
these docs, and it names the page it came from. When the docs do not cover a question, the assistant says so
instead of guessing.

## Speak

Speak turns your voice into text twice: once in your browser, and once on our server, which sends the recording
to a speech-to-text service and does not keep it. The two transcripts go to the assistant together, so one
misheard word in either is corrected by the other.

## Allowance and levels

Each assistant answer counts once against your plan's monthly AI allowance. The dashboard shows what is left and
when it resets (the first of each month).

| Plan | Answers a month | Level |
|---|---|---|
| Free | 30 | Spark — fast and efficient |
| Pro | 300 | Pulse — sharper reasoning |
| Team | 1,000 | Surge — deepest thinking |

These are today's figures. They are set per plan by the Native Update team and may change. The figures in your
dashboard are always the current ones.

A draft or an answer is a queued job: it appears on the [Jobs page](./jobs) while it runs.
