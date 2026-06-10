# AGENTS.md — native-update-docs

Mirror of `CLAUDE.md` for non-Claude AI agents. See `CLAUDE.md` for the full canonical version. Both files MUST be kept in sync.

## TL;DR

- Docusaurus 3 site for the `native-update` Capacitor plugin (https://www.npmjs.com/package/native-update, parent npm v3.0.1).
- yarn only (`yarn@4.14.1`).
- Status: all 10 docs batches COMPLETE — 58 `.md` pages, ~71k words (Diátaxis). Flow CLOSED.
- Live URL: https://docs.nativeupdate.aoneahsan.com (Firebase Hosting site `native-update-docs`).
- Plan + tracker live in the sibling repo: `/home/ahsan/Documents/01-code/projects/native-update/docs/docs-site/`.
- Re-run protocol: read `tracker.json` FIRST. Resume at lowest pending batch. Honour 7-day cooldown after final batch.
- Honest framing: no fabricated stats, no marketing claims unsupported by source code.
- Every long page surfaces Ahsan Mahmood author credit via `.nu-author-card` div.
- ONE commit per docs-site batch.
- Build gates (2026-05-29): `yarn typecheck` exit 0 · `yarn build` exit 0.

## Hard checks before editing

1. Did you read `native-update/docs/docs-site/tracker.json`? If not, do that first.
2. Do you have the source-of-truth file open for the API you are documenting? If you are about to write a method signature, you should have just read it from `native-update/src/definitions.ts`.
3. Did you invoke the matching skills for this batch (per the skill-bindings table in `CLAUDE.md`)?

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

## Share Feature — Web + Mobile Contract (IRON-SOLID)

All user-facing "share" actions follow the global contract: **web** (any browser, incl. mobile web) opens an in-app `WebShareModal` — a social grid (X, Facebook, LinkedIn, WhatsApp, Telegram, Reddit, Email web-intents) + a copy-link button; **native** (Capacitor) uses the OS share sheet via `@capacitor/share`. The web-vs-native split is decided at button-click via `Capacitor.isNativePlatform()`. ❌ Never use `navigator.share` as the primary web path with a silent clipboard fallback. **Full spec: `~/.claude/rules/share-feature.md`.**

## Last Updated

2026-05-29
