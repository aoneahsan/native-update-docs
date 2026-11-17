# Search, analytics, and the AI audience

## Search

**Every product docs site uses `@easyops-cn/docusaurus-search-local`** — jump to that section below. The
pagefind + Canary setup documented first is **`ahsan-notebook`-only**: it exists because that site is
auth-gated, which no product docs site is. Read it for technique, not as a choice to make.

### 🔴 `ahsan-notebook` ONLY — pagefind + Canary (an auth-gated site)

```jsonc
// package.json — the index is generated AFTER the build, from the emitted HTML
"build": "dotenv -e .env -- docusaurus build && npx pagefind --site build"
```

```ts
themes: [
  '@docusaurus/theme-mermaid',
  '@getcanary/docusaurus-theme-search-pagefind',   // Canary search UI over the pagefind index
],
```

Why this pairing wins on a gated site:

- **Algolia DocSearch is impossible** — its crawler cannot pass the auth wall.
- **pagefind indexes the final static HTML**, so it sees exactly what ships; and because the auth gate is a
  client-side wrapper with an SSR bypass (see `theming-auth-capacitor.md`), the build output contains full
  content for pagefind to index.
- **Canary** gives the modern AI-search-style modal entirely locally — no SaaS, no account, no data leaving
  the site. Zero options needed; defaults work.

Consequences to remember: `docusaurus start` has **no index** — search appears broken in dev; that is
expected. Verify search on `yarn serve` over a real build. The pagefind assets are post-build files — link
checkers cannot see them (absolute-URL rule in `site-config.md`).

### ✅ The standard for every product docs site → `@easyops-cn/docusaurus-search-local`

```ts
themes: [
  '@docusaurus/theme-mermaid',
  [require.resolve('@easyops-cn/docusaurus-search-local'), {
    hashed: true,
    indexDocs: true, indexBlog: true, indexPages: true,
    docsRouteBasePath: '/docs', blogRouteBasePath: '/blog',
    language: ['en'],
    highlightSearchTermsOnTargetPage: true,
    searchResultLimits: 12, searchResultContextMaxLength: 60,
    explicitSearchResultPath: true,
  }],
],
```

Indexes at bundle time, so it also works in dev. Fine default for public docs; switch to pagefind+Canary only
when the AI-style UI or final-HTML fidelity matters.

## Analytics — env-gated, three wiring mechanisms

Absent env var ⇒ the provider is **skipped entirely**: no script tag, no SDK init, no console errors.
Disclose active providers at `/docs/privacy`.

| Provider | Mechanism |
|---|---|
| GA4 | conditional spread inside the preset: `...(GA_ID ? { gtag: { trackingID: GA_ID, anonymizeIP: true } } : {})` |
| Microsoft Clarity | official inline snippet as a `headTags` `<script>` entry, emitted only when the id exists |
| Amplitude / Sentry | keys through `customFields`; init in a **`clientModules`** file — the Docusaurus hook that runs in every page's bundle at boot |

```ts
clientModules: [require.resolve('./src/clientModules/third-party-analytics.ts')],
```

## The AI / machine-readable audience

Docs sites are implemented against by coding agents. Ship, as plain files in `static/` or generated routes:

- **`llms.txt`** at the root (llmstxt.org format) — honest framing: Google states it ignores it; other
  engines and AI agents are the audience (owner decision 2026-07-20).
- **`/openapi.json`** wherever there is an API — tell agents it is the machine truth to read first.
- **Raw markdown mirrors** (`/raw/…` + a `/raw/manifest.json` index, the fileshub-docs pattern) so an agent
  can fetch content without HTML parsing.
- An **AI-integration page** stating base URL, auth header, endpoint map, response envelope — written for an
  agent implementing in one pass, not a human skimmer.
- `robots.txt` allowing the AI crawlers (see `aoneahsan-cccs-react-seo` for the allowlist), `sitemap.xml`,
  RSS+Atom feeds with `xslt: true`.

Docusaurus prerenders every page, so non-JS crawlers get real content by default — confirm with
`curl <url>` that the body is populated, and keep `headTags` carrying the full favicon ladder and OG/Twitter meta with
**absolute** image URLs (see the ztools-docs record for the complete tag set).

🔴 **Never put a `rel="canonical"` in `headTags`** (2026-10-27, GSC audit SA-P01). Docusaurus already emits one
per-route canonical, so a global entry gives every page a second canonical that names the homepage. Empora
docs had it at `docusaurus.config.ts:32`, and other docs sites carried the same defect. Remove it on sight and
verify with the `canon-sweep` probe in `aoneahsan-cccs-search-audit/references/probes.md`. The same audit
added three rules:
- `themeConfig.image` must exist in `static/` (LifeWell's 404'd);
- `sitemap.ignorePatterns` must exclude search with a full-URL glob such as `**/search/**`;
- the search plugin emits `property="robots"`, which does not set a crawler directive; wrap `@theme-original/SearchPage` in `@docusaurus/Head` with `name="robots" content="noindex, follow"`. Do the same for tag pages when they are excluded from the sitemap;
- every generated category needs `link.description`.

## Summary moved from SKILL.md §5 (verbatim, 2026-11-02)

Search: `@easyops-cn/docusaurus-search-local`. Analytics are env-gated — absent key, provider skipped. Docs
exist partly so **coding agents** can implement against them: raw Markdown/JSON reachable, `/openapi.json`
where there is an API, an AI-integration page written for an agent, `llms.txt` in `static/`. Docusaurus
prerenders, so non-JS crawlers see real content. Wiring: `references/search-analytics-ai.md`.
