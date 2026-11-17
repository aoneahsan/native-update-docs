# Enrichment in numbered batches — resumable across sessions

Proven on ztools: **45 batches, 573 enriched pages**, none of it written in one sitting. The shape exists
because enrichment is the one SEO task whose size is unbounded, and a pass that loses its place restarts.

## The layout

```
src/content/
  index.ts            // merges every batch; the ONLY thing the build imports
  batch-01.ts         // pages 1-15
  batch-02.ts         // pages 16-30
  …
docs/features/seo-content/00-tracker.json
```

`index.ts` spreads the batches into one `CONTENT_BY_SLUG` map. A batch that does not exist yet simply is not
merged — which is what makes the fallback in `content-contract.md` load-bearing rather than defensive.

## The tracker

```jsonc
{
  "module": "seo-content",
  "lastUpdated": "2026-08-14",
  "totalPages": 519,
  "batchSize": 15,
  "batches": [
    {"id": "batch-01", "status": "complete", "pages": 15, "completedAt": "2026-08-10", "commit": "a1b2c3d"},
    {"id": "batch-02", "status": "in_progress", "pages": 15, "note": "8 of 15 written"}
  ],
  "resumeInstructions": "Read this file, take the first batch that is not complete, and write only that batch."
}
```

Same contract as every other feature tracker (`~/.claude/rules/feature-trackers.md`), including the close-out
rule: **a batch's row is flipped in the same commit as its content**, never afterwards.

## One batch per prompt

1. Read the tracker; take the first batch whose status is not `complete`.
2. Write **only** that batch's records. Do not start the next one because there is room — context spent on
   batch N+1 is context the review of batch N no longer has.
3. Run the per-page gates from `content-contract.md` over the batch.
4. Flip the batch row, bump `lastUpdated`, append a `runHistory` entry, commit **with the content**.
5. Report the honest count: pages written, pages remaining, gates run.

## Quality gates per batch

- Every record passes the per-page gates.
- 🔴 **No two pages in the batch share sentences.** The temptation under volume is a paragraph with three
  substituted words, which is precisely the thin-content pattern the whole exercise exists to remove. Spot-check
  by sorting the intros and reading the neighbours.
- Every claim in the batch is checkable. Under volume, invention is the failure mode — a plausible statistic is
  faster to write than a real one.
- The batch's pages are reachable: each appears in the sitemap and has useful contextual navigation.

## When to stop

Enrichment is **never "finished"** in the sense of a feature. Stop when every page has a record that passes its
gates, and treat later work as refresh rather than backlog. 🔴 **Do not let it become the project** — the app is
the deliverable, and a content pass that outgrows the feature work has the same problem an oversized test suite
has (`~/.claude/rules/dev-workflow.md`).

## Refresh cadence

A page whose `lastUpdated` is a year old and whose content is unchanged is honest but stale. Revisit the
top-traffic pages quarterly, change something real, and only then move the date.
