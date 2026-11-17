---
name: aoneahsan-cccs-postbuild-seo-html
description: 'Build-time static HTML generation for SPA routes: per-route metadata and JSON-LD, a crawlable noscript body for non-JS AI crawlers, the per-page content model, and the SVG-master to PNG OG asset pipeline. Use when a single-page app must be indexable, when crawlers see an empty page, or when building OG images.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/projects/ztools-seo.md
---

# Post-build static HTML

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" first. It supersedes
older numerical examples and unsupported provider claims in this skill and its references.


A SPA ships one empty `<div id="root">` to every crawler, and crawler rendering capabilities differ; verify the target. A
build-time generator fixes that without adopting a framework: `vite build && tsx postbuild-seo.ts`.

ztools is the reference implementation — 519 tools, one 2,089-line generator.

## The architecture

1. **Derive everything from the app's own data.** Read the route table and the content registry; synthesise
   category pages by grouping. No hand-maintained page list — that is what makes hundreds of pages
   maintainable.
2. **Generate crawler artefacts** — `sitemap.xml`, `robots.txt`, `feed.xml`, `llms.txt` — into **both**
   `public/` and `dist/`, so they can be refreshed without a full build.
3. **Rewrite `dist/index.html`** — substitute live placeholders, inject an above-the-fold skeleton.
4. **Emit one HTML file per route** — every content page, static page, category and post.

## 🔴 The generated pages ARE the app

Scrape the built `index.html` for its `<script src>`, `rel="stylesheet"` and `rel="modulepreload"` tags and
**re-inject them into every generated page**. Each static page then boots the full React app.

This matters: they are not alternate pages to drift or look like cloaking. The prerendered head and body exist
purely for crawlers; humans get the identical app.

🔴 **An address with no page answers 404, never the home page.** A host's single-page-app fallback answers every
unknown path with `index.html` and a 200: soft 404s, and copies of the home page under its canonical. On
Cloudflare Pages the fallback is on whenever the build has no top-level `404.html`, so emit one: `noindex`, no
canonical, no `og:url`, still booting the app so its own not-found page draws. Then guard every client route with a
route-coverage test: each one is a prerendered page, under a prefix the host rewrites to the app shell, or on a
reasoned allowlist. The host table and the tests are in `aoneahsan-cccs-sitemap` (first case: Rent Party, 2026-10-12).

## The `<noscript>` body is the AI-crawler surface

Render the page's real content — use cases, steps, examples, FAQ, tips — as semantic HTML inside `<noscript>`.
This is what GPTBot, ClaudeBot and PerplexityBot actually read. Close it with a link to the canonical URL.

🔴 **It is GENERATED from the page's own content source, never re-typed for crawlers.** A hand-written page
whose section headings live at their component call sites gives the build nothing to import, and the body
silently stays a stub: habitforge shipped a 2,000-word landing page whose `<noscript>` was **three lines**, with
every gate green. Extract the headings into the record both consumers read, and ship the drift assertion with
it — the full contract and its gates are `aoneahsan-cccs-seo-content-writing`.

## Content model

One typed contract per page: `distinctTitle`, `distinctDescription`, `intro`, `useCases[]`, `howItWorks[]`,
`examples[]`, `faq[]`, `tips[]`, `keywords[]`, `lastUpdated`, `author`.

**`distinctTitle` and `distinctDescription` describe the page.** They do not establish why Google
excluded a URL or force its selected canonical.

Emit one canonical output per real page. 🔴 The template `index.html` carries **no** canonical: a hardcoded
root canonical plus the per-route one gives every page two canonicals (SA-P01, 2026-10-26 GSC audit).
Verify with the `canon-sweep` probe of `aoneahsan-cccs-search-audit`. A route alias maps to that canonical path or a redirect; it does not
generate a second HTML file, sitemap entry, feed item, or near-duplicate content record.

Author in **numbered batch files** merged by an index, so enrichment is resumable across sessions (ztools:
45 batches, 573 enriched pages). **Degrade gracefully** — if the content module is missing, warn and fall back
to templated metadata. Enrichment is additive; the build never breaks because it is incomplete.

## Live placeholders

Ship `__TOOL_COUNT__`, `__DATE_MODIFIED__` and similar in the source HTML and substitute real values at build
time, so a stated number can never go stale.

## OG assets: SVG master → PNG export

Parallel `public/og/svg/` and `public/og/png/` trees with identical structure. **HTML references only the
PNG** — social scrapers do not render SVG — while the SVG stays the editable master. Map many pages onto few
images by category, with a guarded fallback.

For the generator structure, the HTML template and the asset pipeline, read `references/generator.md`.

## Related skills

`aoneahsan-cccs-seo-content-writing` (the content records this generator consumes, and the batched enrichment
that fills them) · `-search-indexing` (verify the emitted canonical per page in `dist/`, then submit) ·
`-react-seo` (the funnel, and the robots.txt crawler-group trap this emits) · `-react-aeo` · `-sitemap` ·
`-feed`.
