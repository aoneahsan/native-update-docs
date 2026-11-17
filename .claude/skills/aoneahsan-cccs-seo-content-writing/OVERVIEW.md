# Overview — `aoneahsan-cccs-seo-content-writing`

D009 (2026-09-08): apply the evidence contract in `~/.claude/rules-detail/seo-aeo-ranking.md` first.
Historical numeric templates are optional editorial examples, never provider requirements.


## Purpose

The content half of search visibility. Most "SEO problems" are indexing problems and most indexing problems
are content problems — this skill owns the content, so `-react-seo` can stay about diagnosis and
`-postbuild-seo-html` about generation.

## What this skill does

- Establishes that **page content is data**: one typed record per page, read by the rendered page, the
  prerendered `<head>`, the `<noscript>` crawler body, the sitemap and the feed.
- Carries the **habitforge ISSUE-003 precedent** — a 2,000-word landing page whose crawler body was three
  lines, because its headings lived at component call sites — and names the one correct fix out of three
  plausible ones, with the drift assertion that keeps it fixed.
- Specifies the **field contract** (`distinctTitle`, `distinctDescription`, intro, use cases, how-it-works,
  examples, FAQ, tips, keywords, lastUpdated, author) with each field's own rule, and identifies the two
  fields that describe a page without guaranteeing indexing.
- Sets the **purpose-based content acceptance** for programmatic pages and the answer-first structure for clear reading; no snippet or citation guarantee.
- Sets the **honesty gates**: no invented statistic, no keyword stuffing, no stale claim about what the
  product is, no fake freshness date.
- Gives the **resumable numbered-batch enrichment workflow** for enriching hundreds of pages across sessions.

## When it gets invoked

- Writing or enriching public page copy for search.
- Pages are indexed but thin, or GSC says *Crawled – currently not indexed*.
- Before launching programmatic or template-generated pages.
- A prerendered or `<noscript>` body shows less than the page itself.
- Someone asks to improve AI-search visibility through content.

## Where it applies

Every public-facing web project, and especially any project with more pages than a person can hand-write.

## Sources

`rules-detail/seo-aeo-ranking.md` §2 (the page-purpose acceptance) and §13 (the batch workflow proven on ztools),
`_source-understanding/projects/ztools-seo.md`, `urls/google-seo.md`, and the habitforge W1 ISSUE-003 record.

## Related skills

`aoneahsan-cccs-postbuild-seo-html` (the generator) · `-react-seo` (the funnel) · `-react-aeo` (answer
engines) · `-search-indexing` (submission and monitoring) · `-sitemap` · `-feed` · `-copywriting` (voice) ·
`-unit-testing` (the drift assertion).

## Maintenance

Keep the field contract aligned with current provider guidance, and keep the
`references/batch-workflow.md` tracker shape aligned with `~/.claude/rules/feature-trackers.md`.
