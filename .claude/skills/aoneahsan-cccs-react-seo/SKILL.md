---
name: aoneahsan-cccs-react-seo
description: 'Search visibility for web projects: diagnosing the indexing funnel before optimising, per-page metadata and structured data, robots.txt including the crawler-group trap, and submission to Google, Bing and Yandex. Use when pages are not appearing in search, when adding a public route, when deciding whether an outbound link is do-follow or nofollow, or when asked to "fix SEO".'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/urls/google-seo.md
---

# SEO

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" first. It supersedes
older numerical examples and unsupported provider claims in this skill and its references.


## Diagnose the funnel before optimising anything

"I submitted my sitemap and Google still doesn't show me" is almost never a ranking problem. Work the funnel
in order:

1. **Indexed?** Search Console → **Pages** and URL Inspection. `site:` is not exhaustive.
2. **Crawlable?** Does `robots.txt` allow it — including the JS files the page needs?
3. **Renderable?** URL Inspection → **TEST LIVE URL** → **View Tested Page** → read the rendered HTML *as
   Googlebot sees it*. **If the content is missing there, nothing else matters.** For our SPAs this is the
   empirical test that prerendering works.
4. **Ranking?** Only now evaluate relevance, usefulness, reputation and navigation against measured queries.

| GSC reason | What it means | Fix |
|---|---|---|
| Discovered – not indexed | known but no reported crawl in this state; cause unknown | inspect availability, discovery and crawl evidence |
| **Crawled – not indexed** | crawled but not indexed; cause requires evidence | per-page uniqueness (below) |
| Alternate page with canonical | a canonical points elsewhere | verify it is intentional |
| Soft 404 | 200 but looks empty | real content, or a real 404 |

## Per-page purpose

Use an accurate, concise `<title>` and useful meta description for each page; numerical lengths are
editorial previews, not search eligibility rules. Escape punctuation correctly. Use one `<h1>`, ordered
heading levels, descriptive `alt`, the intended canonical, and contextual links that help the reader.

For programmatic pages (tools, locations, templates), the floor is **purpose-appropriate original content** across a
purpose-led introduction, use cases, how-it-works steps, examples, an FAQ, and tips when those sections help. **The content contract, the
per-page gates and the batched enrichment loop live in `aoneahsan-cccs-seo-content-writing`**;
`-postbuild-seo-html` is how ztools generates from it.

**Do not chase keyword counts.** Older guides suggest repeating a term 3–4 times; write for the reader and let
variants occur naturally.

## 🔴 The robots.txt crawler-group trap

**A crawler obeys only its own most-specific `User-agent` group and ignores `*`.** So the moment you add an
explicit `User-agent: GPTBot` block to allow AI crawlers, that bot **stops inheriting your `Disallow` rules**
and can crawl `/admin`.

Every explicitly-named crawler must repeat the private-route guard. The owner's bot policy (2026-10-27) is to
**allow all AI bots on public pages, search and training alike**; the list and template are in
`aoneahsan-cccs-search-audit/references/ai-bot-policy.md`. 🔴 `llms.txt`, `feed.xml`, `sitemap.xml` and
`robots.txt` must never reach the SPA fallback (200 HTML), and unknown paths answer a real 404. The
fleet-wide check for both is `/search-audit`. ztools generates this with an
`allow(ua, extra)` helper rather than by hand.

## 🔴 Outbound links — do-follow is a ranking decision, so make it deliberately

**Our own products and profiles are do-follow; every other third-party link is `nofollow`.** Passing
credit to our own properties is the point of linking to them at all, and passing it to a stranger is
giving it away for nothing.

- It is a host **AND path** question: `github.com/<us>` is ours, `github.com/<anyone>` is not.
- `rel="me"` proves ownership by itself — an admin-managed social table holds hosts no allowlist knows.
- 🔴 **Check the CRAWLER-visible output, not the source.** If the project prerenders, a `rel` written
  in a React component may not exist in the static HTML an AI crawler reads. Grep the built output.

Every external link also opens in a new tab. Full law: `rules-detail/frontend-ui-standards.md` §15.

## Submit once, then monitor

Google Search Console (domain property, DNS TXT) · Bing Webmaster Tools (**read the current site quota from the official provider API**, plus
IndexNow) · Yandex Webmaster (cheap; only optimise further if the Russian market is actually a target).
Generate verification tokens into `docs/seo-verification.md` for the owner — never guess a code into HTML.

🔴 **The operational half — property setup, IndexNow, the per-state triage ladder, noindex-vs-canonical-vs-
Disallow, verifying canonicals in the BUILT output, and the weekly cadence — is
`aoneahsan-cccs-search-indexing`.** Go there once the pages exist; this skill is the diagnosis.

For metadata, structured data and the audit workflow, read `references/checklist.md`.
