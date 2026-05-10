# CLAUDE.md — native-update-docs

Public Docusaurus documentation site for the `native-update` Capacitor plugin.

## Identity

| Key | Value |
|---|---|
| Repo | `native-update-docs` |
| Status | Batch 1 (foundation) complete; Batches 2–10 pending |
| Type | Docusaurus 3 documentation site |
| Package manager | yarn@4.10.3 (NEVER npm/pnpm) |
| Node | >=18 |
| Author | Ahsan Mahmood ([aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)) |
| Live URL | TBD — Firebase Hosting (Batch 10) |
| Source plugin | https://www.npmjs.com/package/native-update |
| Sibling project | `/home/ahsan/Documents/01-code/projects/native-update/` (the plugin itself) |
| Plan file | `native-update/docs/docs-site/plan.md` |
| Tracker file | `native-update/docs/docs-site/tracker.json` |

## 3-Day Freshness Rule

This file must be reviewed every 3 days. Bump `Last Updated` and update the status table when sections of the docs change.

## Critical rules

| Rule | Detail |
|---|---|
| Yarn only | Never `npm install` or `pnpm add`. The repo locks `packageManager: "yarn@4.10.3"`. |
| No dev server in agent runs | Per global rule, the agent does not run `yarn start`. The user runs and tests. The agent runs `yarn build` and `yarn typecheck` to verify. |
| Single source of truth | Every API fact MUST come from the `native-update` repo's `src/`, `cli/`, or `backend/` source. No invented method names, no hallucinated parameters. Read the source before documenting it. |
| Honest framing | Say what the plugin does NOT do as clearly as what it does. No fabricated stats. Cite sources by name. |
| Author credit | Every long page surfaces "Built by [Ahsan Mahmood](https://aoneahsan.com)" via `.nu-author-card` div. |
| One commit per batch | This repo gets ONE commit per docs-site batch. Don't make per-file commits. |

## Verification commands

```bash
yarn typecheck       # tsc --noEmit (must exit 0)
yarn build           # docusaurus build (must exit 0, must produce ./build)
yarn serve           # preview built site at :5961
```

## Sibling-repo contract

The `native-update/docs/docs-site/tracker.json` tracker is the canonical source of project state. On every re-run of the docs-site prompt:

1. Read `tracker.json` first.
2. If `last_run.status == "complete"` AND today < `last_run.next_allowed_run_after` → SKIP, tell the user the date.
3. If `last_run.status == "in_progress"` → resume at the lowest `batches[*]` with `status != "completed"`.
4. After Batch 10 completes: set `last_run.status = "complete"`, `completed_at = today`, `next_allowed_run_after = today + 7d`.

## Skill bindings (per batch)

| Batch | Skills to invoke FIRST |
|---|---|
| 1 (this one) | `documentation-writer`, `ai-seo`, `copywriting` |
| 2–4 (SDK reference) | `documentation-writer`, `ai-seo` |
| 5 (CLI reference) | `documentation-writer`, `technical-writing` |
| 6 (Backend) | `documentation-writer`, `technical-writing` |
| 7 (Platforms) | `documentation-writer`, `technical-writing` |
| 8 (Tutorials/How-to) | `documentation-writer`, `ai-seo`, `copywriting` |
| 9 (Concepts) | `documentation-writer`, `ai-seo` |
| 10 (SEO + Deploy) | `seo`, `ai-seo`, `firebase-hosting-basics`, `firebase-basics` |

## Last Updated

2026-05-10
