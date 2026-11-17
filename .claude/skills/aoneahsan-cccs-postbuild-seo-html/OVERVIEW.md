# Overview — `aoneahsan-cccs-postbuild-seo-html`

D009 (2026-09-08): apply the evidence contract in `~/.claude/rules-detail/seo-aeo-ranking.md` first.
Historical numeric templates are optional editorial examples, never provider requirements.


## Purpose

Makes a single-page application indexable and citable without migrating to an SSR framework. It solves the
concrete problem that a SPA serves an empty root div to crawlers, and that crawler rendering support varies; verify each target.

## What this skill does

- Describes the **four-stage generator**: derive from the app's own data, write crawler artefacts to both
  `public/` and `dist/`, rewrite the built `index.html`, then emit one HTML file per route.
- Requires the generated pages to **re-inject the SPA's own asset tags**, so each static page boots the real
  app — they are not alternate pages that can drift, and their content must remain equivalent.
- Identifies the **`<noscript>` body as the AI-crawler surface** and requires the page's real content to be
  rendered there as semantic HTML.
- Defines the **per-page content contract** and names `distinctTitle`/`distinctDescription` as the specific
  fix for the two GSC categories that plague programmatic sites.
- Requires content to be authored in **numbered batch files** so enrichment is resumable, and to **degrade
  gracefully** so a partially-enriched site still builds.
- Requires **build-time placeholder substitution** so stated counts follow the build and dates follow real content changes.
- Specifies the **SVG-master to PNG-export** OG asset pipeline with parallel trees, and the category-mapping
  strategy that covers hundreds of pages with a dozen images.

## When it gets invoked

- A SPA needs to be indexable, or crawlers are seeing an empty page.
- Adding routes or a content type to a prerendered site.
- Building or changing OG images, favicons or social assets.
- Enriching programmatic pages to clear "Crawled – currently not indexed".
- Auditing whether prerendering is actually working.

## Where it applies

Every client-rendered public site. Not Docusaurus sites, which prerender already.

## Sources

`_source-understanding/projects/ztools-seo.md` — the full architecture of `postbuild-seo.ts` at commit
`ab5f6992` — plus `urls/google-seo.md` for the indexing categories the design targets.

## Related skills

`aoneahsan-cccs-react-seo` (the metadata and diagnosis this implements) · `-react-aeo` (the content structure)
· `-sitemap` · `-feed` · `-frontend-design` (the SVG-first rule) · `-nodejs` (build-tool obligations).

## Maintenance

Re-check against ztools when its generator changes — it is the living reference.
