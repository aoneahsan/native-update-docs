# Overview — `aoneahsan-cccs-search-indexing`

D009 (2026-09-08): apply the evidence contract in `~/.claude/rules-detail/seo-aeo-ranking.md` first.
Historical numeric templates are optional editorial examples, never provider requirements.


## Purpose

The operational half of search visibility: owning the engine properties, pushing changes, reading what the
engines report back, and correcting the suppression mechanism when the wrong one was used. `-react-seo`
diagnoses the funnel; this skill runs the machinery once pages exist.

## What this skill does

- Specifies **property ownership**: a GSC Domain property via DNS TXT or a correctly scoped authorized URL-prefix property, plus Bing (the Copilot surface) and Yandex.
- Requires verification tokens to be **generated into `docs/seo-verification.md` for the owner**, never guessed
  into HTML, because a wrong token fails silently and looks like slow crawling.
- Positions **IndexNow** as the supported change-notification channel, wired to changed URLs only, and states plainly that
  Google has no equivalent.
- Carries the **canonical precedent** (habitforge W1 phase05: eight indexed pages all declaring the landing
  page as canonical) and the command that verifies canonicals **in the built output** rather than the source.
- Separates **noindex vs canonical vs Disallow**, including the trap where `Disallow` prevents the engine from
  ever seeing the `noindex`.
- Gives the **triage ladder** per GSC state with an honest timescale, and routes unresolved indexing states to
  `-seo-content-writing` rather than pretending resubmission helps.
- Uses the project's recorded monitoring cadence and treats a falling count as an observation to investigate.
- Names the **per-project record** so the pass has a date and cannot silently lapse.

## When it gets invoked

- Submitting a site or a docs site to search engines for the first time.
- GSC reports pages as not indexed, or *Alternate page with proper canonical tag*.
- The indexed-page count drops.
- Before a launch, a domain move, or a rebuild's cutover.
- Deciding whether to `noindex` something.
- Someone asks why a live page cannot be found.

## Where it applies

Every public-facing web project and every public docs site.

## Sources

`rules-detail/seo-aeo-ranking.md` §1 (the GSC Pages report), §3 (crawler access), §7 (submission and cadence)
and §9 (when to noindex); `_source-understanding/urls/bing-seo.md` and `urls/yandex-seo.md`; and the habitforge
W1 phase05 canonical defect.

## Related skills

`aoneahsan-cccs-react-seo` · `-seo-content-writing` · `-postbuild-seo-html` · `-sitemap` · `-feed` ·
`-react-aeo` · `-docusaurus`.

## Maintenance

The engines' UIs move; the mechanics do not. Re-verify the GSC click-paths and Bing's daily submission quota if
they stop matching what the console shows.
