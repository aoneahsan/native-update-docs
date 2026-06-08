# CLAUDE.md — native-update-docs

Public Docusaurus documentation site for the `native-update` Capacitor plugin.

## Identity

| Key | Value |
|---|---|
| Repo | `native-update-docs` |
| Status | All 10 docs batches COMPLETE — 58 `.md` pages, ~71k words (Diátaxis: Getting Started, SDK Reference, CLI, Backend, Platforms, Tutorials, How-to, Concepts). Flow CLOSED. |
| Type | Docusaurus 3 documentation site (classic preset + Mermaid) |
| Package manager | yarn@4.14.1 (NEVER npm/pnpm) |
| Node | >=18 |
| Author | Ahsan Mahmood ([aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)) |
| Live URL | https://docs.nativeupdate.aoneahsan.com (Firebase Hosting site `native-update-docs`; confirm DNS/custom-domain at next refresh) |
| Source plugin | https://www.npmjs.com/package/native-update (parent npm `native-update` v3.0.1) |
| Sibling project | `/home/ahsan/Documents/01-code/projects/native-update/` (the plugin itself) |
| Plan file | `native-update/docs/docs-site/plan.md` |
| Tracker file | `native-update/docs/docs-site/tracker.json` |
| Build gates (2026-05-29) | `yarn typecheck` exit 0 · `yarn build` (docusaurus/webpack → `./build`) exit 0 |

## 3-Day Freshness Rule

This file must be reviewed every 3 days. Bump `Last Updated` and update the status table when sections of the docs change.

## Critical rules

| Rule | Detail |
|---|---|
| Yarn only | Never `npm install` or `pnpm add`. The repo locks `packageManager: "yarn@4.14.1"`. |
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

## Portfolio Info File — Weekly Update Rule

- Canonical portfolio info file: `/home/ahsan/Documents/ahsan-notebook/static/assets/personal/projects-info-as-portfolio-item/apps/NATIVE-UPDATE-DOCS_portfolio-info_2026-05-29.md`
- Update at least once per week (and on any material change). Keep the last-updated date in the filename.
- Keep a max-10-entry update history inside the file. On each refresh: prepend today's row, delete the previous dated file, write the new one.
- Tracker: `/home/ahsan/Documents/01-code/docs/tracking/portfolio-info-files-update-tracker.json`
- Note: this is the **docs-site** portfolio file (category `apps`). The parent npm plugin has a SEPARATE file under `packages/NATIVE-UPDATE_portfolio-info_*.md` — do not conflate them.
- Last applied: 2026-05-29

## Package Manager Hierarchy: nvm → npm (global) → yarn (local) (IRON-SOLID)

Three tiers, each tool ONLY for its tier — for the best, most reproducible dev results:
- **`nvm`** → install/update Node.js (which bundles `npm`): `nvm install --lts`. Use nvm to get/update `npm` itself.
- **`npm`** → ALL global packages: `npm install -g yarn` (install yarn globally if missing) + `npm install -g <pkg>` (every other global CLI).
- **`yarn`** → ALL local project work: `yarn`, `yarn add <pkg>`, `yarn add -D <pkg>` inside the project.

❌ NEVER use `npm`/`pnpm` for LOCAL installs. NEVER use `pnpm` at all. ✅ Only `yarn.lock` in the project — delete `package-lock.json` and `pnpm-lock.yaml`.

## Package Upgrades: Use `npm-check-updates`

For dependency upgrades use `npx -y npm-check-updates -u && yarn install` (latest STABLE), NOT `yarn upgrade --latest`. Full rule in global `~/.claude/CLAUDE.md`. Last applied: 2026-05-29 (all deps already at latest — `package.json` unchanged).

## Last Updated

2026-05-29
