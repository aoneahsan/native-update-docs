# SEO reference

## Per-page metadata component

```tsx
<PageMeta
  title="Uploading files | FilesHub"          // accurate and unique
  description="How the upload endpoint works, its limits, and what it returns."
  canonicalUrl="https://…/api/uploads"        // absolute, self-referential
  ogImage="https://…/og/png/api.png"          // absolute, 1200×630
  ogType="article"                            // 'website' for static pages
  twitterCard="summary_large_image"
  keywords={['file upload api', 'storage endpoint']}
  noindex={false}                             // true for admin/auth/dashboard
/>
```

Canonical goes on **every** page, even self-referential — it is what prevents query-parameter duplicates from
splitting signals.

## robots.txt with the guard repeated per crawler

```
Sitemap: https://example.com/sitemap.xml

User-agent: *
Allow: /
Disallow: /admin
Disallow: /sign-in
Disallow: /dashboard
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /admin          ← repeated, because Googlebot ignores the * group entirely
Disallow: /sign-in
Disallow: /dashboard
Disallow: /api/

User-agent: GPTBot
Allow: /
Disallow: /admin          ← and again
…
```

Generate it — hand-maintaining the repeated guard across a dozen crawler groups is how one gets missed.

Allow or block each crawler only according to the owner's explicit search/retrieval/training policy.
The example is illustrative; it grants no training permission.

## Structured data by page type

| Page | Schema |
|---|---|
| page with visible breadcrumbs | `BreadcrumbList` below the homepage |
| homepage / brand | `Organization` + `WebSite` (where applicable) |
| tool / app | `SoftwareApplication` or `WebApplication` |
| blog post | `Article` — `author`, `datePublished`, `dateModified`, `headline`, `image` |
| about / contact | `Person` for the founder, `Organization` |
| FAQ block | `FAQPage` |
| step-by-step | `HowTo` |
| product listing | `Product` + `Offer` |

Apply only to matching visible content. Check current rich-result eligibility; schema validity does not guarantee a feature. Validate at `search.google.com/test/rich-results` after deploy.

## Engine-specific notes

**Bing and Yandex** — check current official access, property, quota and submission documentation before
acting. Record downstream provider relationships only when a current primary source supports them. Apply
the project's engine-order and target-market decisions.

## Audit workflow

1. Locate the web app (root, `website/`, or `apps/*/`).
2. Confirm `robots.txt`, `sitemap.xml`, `feed.xml` exist and are current.
3. Confirm `<PageMeta>` is applied to **every** route.
4. Walk routes; record per-route state in `docs/seo-tracking.json` (path, title, description, canonical,
   og_image, structured_data, h1, internal links, word count, last verified, issues).
5. Verify the sitemap covers every public route and nothing private.
6. Record the apply date in the project's `CLAUDE.md`.

**Re-run gating:** use source, deployment, provider or policy changes to choose targeted checks. Keep the
verification date tied to checks actually performed.

## Human-only follow-up

Deploy, then: Rich Results Test, PageSpeed Insights, mobile-friendly test, confirm `robots.txt` /
`sitemap.xml` / `feed.xml` return 200, submit sitemaps to each approved engine after its rollout gate, and
record any human indexing requests for the priority pages. Put these in `docs/MANUAL-TASKS.md`.
