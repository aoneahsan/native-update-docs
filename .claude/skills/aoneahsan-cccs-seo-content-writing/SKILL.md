---
name: aoneahsan-cccs-seo-content-writing
description: 'Writing the page content search and answer engines actually index: the typed per-page content contract both the rendered page and the prerendered crawler body read from, page-purpose acceptance without indexing guarantees, answer-first structure, resumable batch enrichment, and the no-invented-statistic gate. Use when writing or enriching page copy for search, when pages are indexed but thin, or before launching programmatic pages.'
metadata:
  author: aoneahsan
  source: rules-detail/seo-aeo-ranking.md §2 + §13, projects/ztools-seo.md, habitforge ISSUE-003
---

# SEO content writing

🔴 **Floor:** `aoneahsan-cccs-custom-made`. What this produces must look and read as made by hand for this one product, never AI-generated (owner, 2026-11-04).

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" first. It supersedes
older numerical examples and unsupported provider claims in this skill and its references.


**A page's content is DATA, and every surface renders from the same record.** The human page, the prerendered
`<head>`, the `<noscript>` crawler body, the sitemap entry and the feed item are five consumers of one source —
never five texts kept in step by hand.

## 🔴 The crawler body is GENERATED from the page's own content, never re-typed

The failure has a shape and a name. **habitforge ISSUE-003:** a landing page grew to nine chapters and roughly
two thousand words, all headings hardcoded at their component call sites. The build had no table to import, so
the `<noscript>` body a non-JS crawler reads stayed **three lines** — for GPTBot, ClaudeBot and PerplexityBot
the most important page in the product was a stub, while every gate stayed green.

Three fixes present themselves and only one is correct:

| Option | Verdict |
|---|---|
| Extract the headings into the content module both consumers read | ✅ **the fix** |
| Duplicate them into a crawler-only table | ❌ a second source of truth, stale on the first edit |
| Have the build parse the rendered HTML or a sibling repo | ❌ couples the build to layout, or to another repo |

🔴 **Ship the drift assertion with it.** A test that fails when a section stops reading the table is
**pre-approved** as a required-minimum parity test (`~/.claude/rules/dev-workflow.md`) — and this defect is
silent by construction, so it is exactly the class that needs one.

## The contract

One typed record per page. Missing fields degrade to templated metadata with a warning; the build never breaks
because enrichment is incomplete.

| Field | Rule |
|---|---|
| `distinctTitle` | accurate, concise and unique across the site |
| `distinctDescription` | useful page summary with correct HTML escaping |
| `intro` | answers the page purpose directly, then adds needed context |
| `useCases[]`, `howItWorks[]`, `examples[]`, `tips[]` | include only the sections and items the page needs |
| `faq[]` | real questions with factual direct answers |
| `keywords[]`, `lastUpdated`, `author` | use only where the product surface needs them; dates and authorship stay truthful |

Accurate metadata helps describe a page. Those two Google states require diagnosis; metadata alone
does not establish or cure their cause. Avoid boilerplate that adds no useful distinction.

## Purpose-appropriate content

For programmatic pages, choose the sections that answer the user's actual needs. No minimum word,
FAQ or internal-link count establishes indexing eligibility. Use clear headings and relevant links;
preserve the shared content source and the project's approved voice and content map.

## 🔴 The honesty gates

- **Never invent a statistic, a study, a percentage or a testimonial.** If a number is not verifiable, it does
  not go on the page. A build-time-generated count ("519 tools across 17 categories") is better than a claim
  *and* cannot go stale.
- **Never keyword-stuff.** Write for the reader; variants occur naturally. Repetition targets are advice from
  2012.
- **Never claim what the product does not do**, and never leave a claim standing that a later decision
  falsified — a "we do not charge" sentence outlives the release that added plans
  (`aoneahsan-cccs-plans-entitlements`).
- **A visible `lastUpdated` must be real.** Bumping a date without touching the content is the one freshness
  tactic that is outright dishonest.

## Enrichment is batched and resumable

Hundreds of pages cannot be written in one session, and a half-finished pass must not lose its place: numbered
batch files merged by an index, one tracker JSON, one batch per prompt, quality gates per batch. ztools proved
it at 45 batches and 573 enriched pages. The loop, the tracker shape and the resume rule:
`references/batch-workflow.md`.

The full field contract, the per-page gate list and the fallback behaviour: `references/content-contract.md`.

## Related skills

`aoneahsan-cccs-postbuild-seo-html` (the generator that consumes this contract) · `-react-seo` (the indexing
funnel and per-page metadata) · `-react-aeo` (what answer engines do with the structure) ·
`-search-indexing` (getting the finished pages indexed) · `-sitemap` · `-feed` · `-copywriting` (the house
voice this is written in) · `-unit-testing` (the drift assertion).
