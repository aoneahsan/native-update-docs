# CLAUDE.md — native-update-docs

Public Docusaurus documentation site for the `native-update` Capacitor plugin.

## Task Speed Over Docs (IRON-SOLID — BEHAVIORAL)

Finish the real task fast + correctly FIRST; docs/trackers/sync are a footnote (≤~20% of effort) — never let recording outpace the fix. HARD STOP when doc work outpaces the change → ship, then ONE line if anything. No new summary/status/completion files unless asked; edit/delete over add; delete stale docs. Full rule: `~/.claude/CLAUDE.md`. (Est. 2026-06-19)

## Identity

| Key | Value |
|---|---|
| Repo | `native-update-docs` |
| Status | All 10 docs batches COMPLETE — 58 `.md` pages, ~71k words (Diátaxis: Getting Started, SDK Reference, CLI, Backend, Platforms, Tutorials, How-to, Concepts). Flow CLOSED. |
| Type | Docusaurus 3 documentation site (classic preset + Mermaid) |
| Package manager | yarn@4.14.1 (NEVER npm/pnpm) |
| Node | >=18 |
| Author | Ahsan Mahmood ([aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)) |
| Live URL | https://nativeupdate-docs.aoneahsan.com (GitHub Pages — auto-deploy on push via `.github/workflows/deploy-docs.yml`) |
| Source plugin | https://www.npmjs.com/package/native-update (parent npm `native-update` v3.0.1) |
| Sibling project | `/Users/pc/Documents/ahsan-work/code/production-projects/native-update/` (the plugin itself) |
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

- Canonical portfolio info file: `/Users/pc/Documents/ahsan-work/ahsan-notebook/static/assets/personal/projects-info-as-portfolio-item/apps/NATIVE-UPDATE-DOCS_portfolio-info_2026-05-29.md`
- Update at least once per week (and on any material change). Keep the last-updated date in the filename.
- Keep a max-10-entry update history inside the file. On each refresh: prepend today's row, delete the previous dated file, write the new one.
- Tracker: `/Users/pc/Documents/ahsan-work/code/docs/tracking/portfolio-info-files-update-tracker.json`
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

## Share Feature — Web + Mobile Contract (IRON-SOLID)

All user-facing "share" actions follow the global contract: **web** (any browser, incl. mobile web) opens an in-app `WebShareModal` — a social grid (X, Facebook, LinkedIn, WhatsApp, Telegram, Reddit, Email web-intents) + a copy-link button; **native** (Capacitor) uses the OS share sheet via `@capacitor/share`. The web-vs-native split is decided at button-click via `Capacitor.isNativePlatform()`. ❌ Never use `navigator.share` as the primary web path with a silent clipboard fallback. **Full spec: `~/.claude/rules/share-feature.md`.**

## Gitignore Hygiene (IRON-SOLID)
`.gitignore` stays current with the project structure — ignore only recoverable artifacts (build/`dist`/`www`/`node_modules`/logs/caches/IDE), never lose source. Custom rules always present: `*.ignore.*`, `project-record-ignore/`. This is a **PUBLIC** repo -> secrets/`.env`/keystores are NEVER tracked.
Full rule + private/public protocol: `~/.claude/rules/project-config.md`.
Gitignore Last Verified: 2026-06-24

## Last Updated

2026-05-29


## Sub-agents & Skills — Main-Context-First (IRON-SOLID)
Default/built-in sub-agents (`general-purpose`, `Explore`, `Plan`, `claude`, `fork`, …) do NOT have
access to `/skills`, so delegating to them silently SKIPS the skills RULE #0 requires. Do all
skill-relevant work in the **MAIN context**; use a sub-agent ONLY when a **custom** agent exists in
`.claude/agents/` for that job; a default `Explore`/`Plan` agent is allowed ONLY for read-only,
no-skill search/exploration. When a relevant skill is missing, **install/enable it** rather than
proceeding skill-less. (Owner directive 2026-07-11; full text in `~/.claude/CLAUDE.md`.)

## Canonical domain + deploy + governance (2026-07-14)

- Canonical docs domain: **https://nativeupdate-docs.aoneahsan.com** (GitHub Pages, Actions build type; DNS = Hostinger CNAME `nativeupdate-docs` -> `aoneahsan.github.io`). Firebase config removed (was never deployed).
- Deploys are AUTOMATIC on push to `main` (`.github/workflows/deploy-docs.yml`); runbook: `DEPLOY.md`. Never add a `packageManager` field (yarn.lock is Berry v4; CI pins Yarn 4.17.1 via Corepack).
- **Version + synced content contract:** `plugin-version.json`, `docs/ai-integration.md`, `docs/changelog.md`, and the llms-full.txt version row are GENERATED by `yarn sync:from-plugin` from the sibling private plugin repo (single source of truth = native-update/package.json). Run it after EVERY plugin release, commit the result — never hand-edit those files or hardcode a version anywhere.
- Public-repo governance applied per `~/.claude/rules/public-repo-governance.md`: main-branch ruleset (PR + 1 approval + `build` check; owner-admin-only bypass), root `CONTRIBUTING.md`, contributor-access issue template.
