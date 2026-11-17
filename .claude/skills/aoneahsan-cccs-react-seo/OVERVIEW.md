# Overview — `aoneahsan-cccs-react-seo`

D009 (2026-09-08): apply the evidence contract in `~/.claude/rules-detail/seo-aeo-ranking.md` first.
Historical numeric templates are optional editorial examples, never provider requirements.


## Purpose

Getting pages found. Its organising idea is that most "SEO problems" are indexing problems and most indexing
problems are content problems — so the skill leads with diagnosis rather than optimisation.

## What this skill does

- Gives the **four-step funnel diagnosis** (indexed → crawlable → renderable → ranking) and the concrete
  Search Console click-path for each, including the live-render test that is the empirical check on whether
  our SPA prerendering actually works.
- Maps each observed GSC state to evidence-led checks and records *Crawled – currently not indexed* without
  assigning a cause from the label alone.
- Sets the **per-page content purpose**: accurate unique title and description, one `h1`, ordered headings,
  descriptive alt text, the intended canonical, useful contextual links and purpose-appropriate original
  content for programmatic pages.
- Warns against keyword-count chasing.
- Carries the **robots.txt crawler-group trap**: naming a crawler explicitly removes it from the `*` group, so
  every named bot must repeat the private-route `Disallow` list or allowlisting AI crawlers silently exposes
  `/admin`.
- Covers submission to Google, Bing and Yandex, with verification tokens collected for the owner rather than
  guessed into HTML.

## When it gets invoked

- Pages are not appearing in search, or GSC reports pages as not indexed.
- Adding a public route or a new content type.
- Before a launch, or when preparing a site for submission.
- Someone asks to "fix SEO" or "get this ranking".
- Writing or reviewing `robots.txt`.

## Where it applies

Every public-facing web project.

## Sources

`_source-understanding/urls/google-seo.md` (Search Essentials, the GSC workflow across three third-party
guides), `urls/bing-seo.md`, `urls/yandex-seo.md`, `urls/general-seo.md` (the attributed numeric limits), and
`projects/ztools-seo.md` (the crawler-group insight, found in its generator).

## Related skills

`aoneahsan-cccs-postbuild-seo-html` (how per-page content is produced) · `-react-aeo` (AI engines) ·
`-sitemap` · `-feed` · `-react-accessibility` (heading structure and alt text overlap).

## Maintenance

The GSC UI changes; the funnel does not. Re-verify click-paths if they stop matching.
