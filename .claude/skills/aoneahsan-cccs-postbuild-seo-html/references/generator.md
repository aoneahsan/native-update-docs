# Generator structure

## Entry point

```json
{ "scripts": { "build": "vite build && tsx postbuild-seo.ts",
               "postbuild:seo": "tsx postbuild-seo.ts --sync-public" } }
```

The `--sync-public` mode refreshes only the crawler artefacts, without needing a full build.

## Main flow

```ts
async function main() {
  const syncPublicOnly = process.argv.includes('--sync-public');
  const distExists = fs.existsSync(distDir);

  const items         = parseItemsData();                 // from the app's registry
  const categoryPages = buildCategoryLandingPages(items);  // derived, not hand-listed
  const posts         = await loadBlogPosts();
  const contentMap    = await loadRichContent();           // degrades to {}

  const outputs = distExists ? [publicDir, distDir] : [publicDir];
  writeCrawlerArtifacts(items, [...PUBLIC_PAGES, ...categoryPages], posts, outputs);

  if (syncPublicOnly) return;
  if (!distExists) throw new Error('dist not found. Run "yarn build" first.');   // fail loudly

  // scrape the SPA's own asset tags — THIS is what makes generated pages the real app
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const scripts = indexHtml.match(/<script[^>]*src="[^"]*"[^>]*><\/script>/g) ?? [];
  const links   = indexHtml.match(/<link[^>]*rel="(stylesheet|modulepreload)"[^>]*>/g) ?? [];
  const spaAssets = [...links, ...scripts].join('\n  ');

  for (const item of items) writeTextFile(pathFor(item), generateSeoHtml(metaFor(item), spaAssets, jsonLdFor(item), bodyFor(item)));
}

main().catch((e) => { console.error(e); process.exit(1); });   // non-zero exit
```

## HTML template essentials

```ts
function generateSeoHtml(meta, spaAssets, jsonLdBlocks = [], bodyOverride?) {
  const fullUrl = `${SITE_URL}${meta.canonicalPath}`;
  const ogImageUrl = `${SITE_URL}/og/png/${meta.ogImage}`;   // PNG, absolute
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(fullUrl)}">
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${escapeHtml(fullUrl)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml">
${jsonLdBlocks.map(b => `  <script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n')}
  ${spaAssets}
</head>
<body>
  <div id="root"></div>
  <noscript>
    <h1>${escapeHtml(meta.title)}</h1>
    <p>${escapeHtml(meta.description)}</p>
    ${bodyOverride ?? ''}
    <p>For the full version, enable JavaScript and reload
      <a href="${escapeHtml(fullUrl)}">${escapeHtml(fullUrl)}</a>.</p>
  </noscript>
</body>
</html>`;
}
```

`escapeHtml` on **every** interpolated value — titles and descriptions come from data files and will
eventually contain a quote or an ampersand.

## Content contract

```ts
interface RichPageContent {
  distinctTitle: string;          // unique — the fix for duplicate-flavoured pages
  distinctDescription: string;
  intro: string;                  // answer the page purpose directly
  useCases: { title: string; body: string }[];
  howItWorks: { step: string; detail: string }[];
  examples: { input: string; output: string; note?: string }[];
  faq: { q: string; a: string }[];
  tips: string[];
  keywords: string[];
  lastUpdated: string;
  author?: string;
}
```

## Graceful degradation

```ts
async function loadRichContent(): Promise<Record<string, RichPageContent>> {
  try {
    const p = path.join(__dirname, 'src', 'data', 'pageContent', 'index.ts');
    if (!fs.existsSync(p)) {
      console.warn('pageContent/index.ts not found — using templated metadata only.');
      return {};
    }
    const mod = await import(pathToFileURL(p).href);
    return mod.PAGE_CONTENT ?? {};
  } catch (error) {
    console.warn('Failed to load pageContent — falling back:', error);
    return {};
  }
}
```

## Batch authoring

```
src/data/pageContent/
  _types.ts      index.ts      batch01.ts … batchNN.ts
```

15 pages per batch keeps quality high and makes each session's work a single reviewable commit. Track
progress in `docs/tracking/<project>-seo-content-tracker.json` so enrichment resumes without re-deriving what
is done.

## OG asset pipeline

```
public/og/svg/{home,categories/*,info/*,errors/*}.svg    ← editable masters, committed
public/og/png/{home,categories/*,info/*,errors/*}.png    ← exports, referenced by the HTML
```

Export with a direct command (no script files):

```bash
npx -y sharp-cli -i public/og/svg/home.svg -o public/og/png/home.png resize 1200 630 -- flatten
```

`flatten` matters — transparent PNGs render unpredictably in social previews.

Map pages to images by category with a guarded fallback, so a dozen images cover hundreds of pages:

```ts
const CORE_OG_IMAGES = new Set(['finance', 'text', 'image', 'developer']);
const ogFor = (category: string) =>
  CORE_OG_IMAGES.has(category) ? `categories/${category}.png` : 'home.png';
```

## Verification

```bash
yarn build
ls dist/**/*.html | wc -l                      # one per route
grep -c "application/ld+json" dist/index.html  # schema present
curl -s https://domain/some-route | head -60   # body has real content, not a shell
```

## Measured on windowsweep, 2026-11-07

- **A prerendered page that draws a runtime state must read it at build time and seed the query cache with it,** and the
  prerender must fail the build when the markup does not draw that state (windowsweep `/pricing`, `a51d724`, watched failing
  on a planted missing seed). A query param the page reads (a pay link's `interval`) is applied only after hydration
  (`useSyncExternalStore` with a server snapshot), so the first client render matches the served HTML.
