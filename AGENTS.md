# AGENTS.md — native-update-docs

Mirror of `CLAUDE.md` for non-Claude AI agents. See `CLAUDE.md` for the full canonical version. Both files MUST be kept in sync.

## TL;DR

- Docusaurus 3 site for the `native-update` Capacitor plugin (https://www.npmjs.com/package/native-update).
- yarn only (`yarn@4.10.3`).
- Plan + tracker live in the sibling repo: `/home/ahsan/Documents/01-code/projects/native-update/docs/docs-site/`.
- Re-run protocol: read `tracker.json` FIRST. Resume at lowest pending batch. Honour 7-day cooldown after final batch.
- Honest framing: no fabricated stats, no marketing claims unsupported by source code.
- Every long page surfaces Ahsan Mahmood author credit via `.nu-author-card` div.
- ONE commit per docs-site batch.

## Hard checks before editing

1. Did you read `native-update/docs/docs-site/tracker.json`? If not, do that first.
2. Do you have the source-of-truth file open for the API you are documenting? If you are about to write a method signature, you should have just read it from `native-update/src/definitions.ts`.
3. Did you invoke the matching skills for this batch (per the skill-bindings table in `CLAUDE.md`)?

## Last Updated

2026-05-10
