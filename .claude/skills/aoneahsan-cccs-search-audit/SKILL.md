---
name: aoneahsan-cccs-search-audit
description: "The /search-audit standard: find and fix every search and AI-answer (SEO + AEO) issue in ONE project across all its surfaces (web app, docs site, npm package, extension, Android listing, backend) from live probes and source, against the SA pattern catalogue built from the 2026-10-26 GSC audit, then record a report the GSC agent can retest and feed new lessons back. Use for /search-audit, a GSC/Bing issue list, 'fix SEO/AEO everywhere', or confirming the fleet is clean."
metadata:
  author: aoneahsan
  source: 2026-10-26 GSC all-property audit (production-projects/search-audit-owner-handoff/gsc-audit-2026-10-26), owner decisions 2026-10-27
---

# Search audit

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" and "§15 — /search-audit" first.

**One project, every surface, every pattern, live evidence.** This skill is the orchestration layer. The
per-topic law stays in its owning skill: `-react-seo` (funnel, robots group trap), `-sitemap` (contract, real
404s by host), `-feed`, `-postbuild-seo-html`, `-docusaurus`, `-search-indexing` (consoles, IndexNow),
`-react-aeo`, `-seo-content-writing`. Never copy their text here; point at it.

## The pattern catalogue is the checklist

`references/issue-catalogue.md` holds **SA-P01…P19 and AI-01…AI-09**. Each one was observed in a real
property (production or frozen) and carries a detection command, a fix per stack and an acceptance test.
🔴 **Every pattern is run in every project**, including the patterns found only on frozen idea projects.
That is how a frozen project's defect is proven absent from production. Each pattern ends in
PASS · FAIL · NA (with the reason) · BLOCKED (with the missing input). It never ends "not checked".

## Surfaces — sweep them all

`references/surfaces.md` lists the checks for each kind of surface. A project usually has several:
- the app or marketing origin;
- a docs site;
- an npm package page and README;
- an extension's store listings and website;
- a Play listing and `assetlinks.json`;
- backend/API origins, which must not be indexable by accident.

Origins come from `~/Documents/01-code/projects/project-live-urls.json`. Repos are swept from inside each
repo (a parent grep skips nested repos). 🔴 An unclear host is an owner question, never a guess.

## Probe first, then trace to source

1. Probe live, read-only, at ≤ 1 request per 0.3 s (`references/probes.md`). Run a sample first, then the
   **full sitemap** for canonical, status and robots checks.
2. Trace each failure to the exact `file:line` in the repo that ships it. Without a trace, the cause is a
   hypothesis and is written as one.
3. Reproduce the failure in the **built output** before fixing (`dist/`, `build/`). The dev server proves
   nothing.

## Owner decisions this skill enforces (2026-10-27)

- **AI bots: allow all** (search, user-fetch and training) on public pages. Private routes are disallowed
  in **every** named group as well as `*`. See `references/ai-bot-policy.md`.
- **Consoles are owner tasks.** GSC and Bing steps become `docs/MANUAL-TASKS.md` rows from
  `references/console-tasks.md`. The agent never signs in to a console.
- **IndexNow is sent automatically** for changed URLs, after live verification only.
- 🔴 Frozen, idea, protected and client projects are **never** cloned, edited or probed for fixes. Their
  records live in the non-production register and serve as patterns only.

## Fix order

1. Wrong-host and duplicate-canonical signals (P08, P01, P02).
2. Discovery endpoints answering HTML or 404 (P10, P04, P05, P09).
3. Sitemap hygiene and real 404s (P06, P11).
4. Preview assets (P03, P13).
5. AEO content and consistency (AI-05, AI-07).

The project's own gates run after every wave. Anything a person sees goes dummy-first, and any words go
through the story system. 🔴 Never remove a privacy control, add a training permission the policy does not
grant, or `Disallow` a page that was meant to be `noindex`.

## Record so the GSC agent can retest

Every run writes a detailed, self-contained report plus `STATUS.json` to
`~/Documents/01-code/production-projects/search-audit-owner-handoff/reports-for-dot-agent/projects/<project>/`.
Each original record ID gets a lifecycle state, the deployed commit and the exact retest command.
Layout and schema: `references/run-records.md`. The project's known records at the start are in
`references/2026-10-26-gsc-baseline.md`.

## Learn every run

The command improves its own system. Anything new it meets goes into
`learnings/inbox/<date>-<project>.md`: a pattern the catalogue lacks, a stack-specific fix, a probe that lied,
a provider change confirmed online, or a skill that gave wrong advice. Parallel sessions never share a file.
`/search-audit fleet` merges the inbox into the catalogue and the owning skills as a union. Protocol:
`references/learning-loop.md`.

## Honesty

`submitted ≠ processed ≠ indexed ≠ cited ≠ visited`. A deploy plus a passing probe makes a record
`live-verified`. The Google outcome stays `google-pending` until the console shows it. 🔴 Never write
"indexed", "fixed in Google" or "100%" from our own probes.
