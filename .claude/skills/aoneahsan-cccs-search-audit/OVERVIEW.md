# Overview — `aoneahsan-cccs-search-audit`

Created 2026-10-27 from the GSC agent's all-property audit of 2026-10-26: 53 properties, 63 core records and
20 root-supplement records. It backs the `/search-audit` command.

## Purpose

One command, run inside one production project, that:
- finds every search-engine and answer-engine issue on every surface the project has;
- fixes what an agent may fix and ships it;
- proves the fix live;
- writes a report the GSC agent can retest from;
- feeds new lessons back into the system.

## What this skill does

- Turns every audit record, from production and frozen projects alike, into a numbered pattern (**SA-P01…P19**)
  plus the nine AI-answer checks (**AI-01…AI-09**). Each pattern has a detection command, a fix per stack and
  an acceptance test (`references/issue-catalogue.md`).
- Lists the checks specific to each surface: web app, docs site, npm, extension, Android, backend
  (`references/surfaces.md`).
- Gives read-only, calibrated probe commands. Each was watched failing on a known-bad URL
  (`references/probes.md`).
- Records the owner's decisions: allow all AI bots with private routes disallowed in every group; consoles
  are owner tasks; IndexNow is automatic after live verification (`references/ai-bot-policy.md`,
  `references/console-tasks.md`).
- Maps each production root to its starting records (`references/2026-10-26-gsc-baseline.md`).
- Defines the shared reports folder the owner hands to the GSC agent, and the `STATUS.json` lifecycle
  (`references/run-records.md`).
- Runs the self-learning loop through a per-run inbox that `/search-audit fleet` merges
  (`references/learning-loop.md`).

## When it gets invoked

`/search-audit` in a production root. `/search-audit fleet` from `~/Documents/01-code`. Also when the owner
pastes a GSC or Bing issue list, or when `/product-audit`'s discoverability lane needs the deep checks.

## Related

`-react-seo` · `-react-aeo` · `-sitemap` · `-feed` · `-postbuild-seo-html` · `-docusaurus` · `-search-indexing` ·
`-seo-content-writing` · `-product-audit` · agents `aoneahsan-ccca-search-auditor`, `aoneahsan-ccca-search-curator`,
`aoneahsan-ccca-seo-optimizer`, `aoneahsan-ccca-docs-writer`.
