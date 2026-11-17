# Site configuration anatomy

The shape every docs site shares. Reference implementation: **ztools-docs** (public repo → GitHub Pages),
recorded in `_source-understanding/projects/ztools-docs-site.md` when present on this machine.
(`projects/a1notebook-docusaurus.md` documents the notebook, which is a **private personal project**, not a
docs site — read it for technique, never as the template.)

## The baseline every new site gets

```ts
const config: Config = {
  future: { v4: true },                      // forward compatibility with Docusaurus v4
  onBrokenLinks: 'throw',                    // the build IS the link checker
  markdown: {
    mermaid: true,
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'throw' },   // v4 location — not the deprecated top-level key
  },
  themes: ['@docusaurus/theme-mermaid', /* + the search theme, see search-analytics-ai.md */],
};
```

Plus `@docusaurus/faster` in dependencies (Rspack — meaningfully faster builds) and the classic preset with:
`docs` (sidebarPath, `editUrl` pointing at the CURRENT repo/branch, `showLastUpdateTime` + `Author`), `blog`
(`feedOptions: { type: ['rss','atom'], xslt: true }`, `showLastUpdateTime: true`), `sitemap` (`lastmod: 'date'`,
`changefreq: null`, `priority: null`, ignore `**/tags/**`, `**/blog/tags/**`, `**/blog/archive/**`, `**/blog/authors/**`,
`**/search/**` (the plugin matches full URLs, not root-relative paths), plus `createSitemapItems`, see "Sitemap, feed and the four routes" below), `theme.customCss`. Excluded search and tag pages also need `name="robots" content="noindex, follow"` in their theme wrappers.
(Until 2026-10-12 this line said `changefreq: 'weekly'`. Google ignores changefreq and priority, so both are
`null` now.)

## Environment variables → client code

Two mechanisms, used together. `.env` loads either via `dotenv-cli` wrapping every script
(`dotenv -e .env -- docusaurus build`) or `import 'dotenv/config'` at the top of the config file.

1. **`customFields`** — SSR-safe; client reads `useDocusaurusContext().siteConfig.customFields`. Use for
   anything a React component needs.
2. **DefinePlugin for `process.env.*`** — for code (or libraries) that reads `process.env` directly:

```ts
plugins: [
  function injectEnvVarsPlugin() {
    return {
      name: 'inject-env-vars',
      configureWebpack(_config, _isServer, { currentBundler }) {
        return {
          plugins: [
            // ⚠️ currentBundler.instance, NOT an imported webpack.DefinePlugin —
            // @docusaurus/faster runs Rspack, and only the injected instance works on both.
            new currentBundler.instance.DefinePlugin({
              'process.env.SOME_KEY': JSON.stringify(process.env.SOME_KEY || ''),
            }),
          ],
        };
      },
    };
  },
],
```

Log SET/NOT-SET (never values) during config evaluation so a missing key is visible at build time.

## Plugins in the standard kit

| Plugin | Notes |
|---|---|
| `plugin-pwa` | `offlineModeActivationStrategies: ['appInstalled','standalone','queryString']` + `pwaHead` (manifest link, theme-color, apple tags). Pair with `static/manifest.json` and a swizzled `PwaReloadPopup`. Offline only testable on a real build (`yarn build && yarn serve`). |
| `plugin-ideal-image` | `quality: 85, max: 1920, min: 640, steps: 4`. Needs `sharp` — under yarn 4 add `dependenciesMeta.sharp.built: true` or the postinstall is skipped and images silently stop optimising. |
| `plugin-client-redirects` | Ship it from day one, even with an empty list — moving a page then means adding a row, not adding a plugin. |

## Deployment — one path only

| Concern | Every product docs site |
|---|---|
| Repo | **public** (CONTRIBUTING.md, issues on, branch ruleset per `rules/public-repo-governance.md`) |
| Host | **GitHub Pages** |
| Domain | **`static/CNAME`** holding the domain derived per `domains-and-deploy.md` (`<sub>-docs.<base>.<tld>`, or `docs.<apex>` for an apex project) |
| Deploy | Build and verify locally, then publish by hand to the `gh-pages` branch with an ordinary fast-forward push — no GitHub Actions (owner, 2026-10-31; `~/.claude/rules/docs-sites.md`, procedure in `domains-and-deploy.md`) |
| Config | `url` = the docs domain · `baseUrl: '/'` · `organizationName: 'aoneahsan'` · `projectName: '<repo>'` |
| Firebase | ❌ **none** — no `firebase.json`, no `.firebaserc`, no `firebase:deploy` script, no Firebase project |
| Secrets | ❌ **none in the repo** — only `.env.example`; real values in repo Actions secrets, every one optional |

**GitHub Actions:** none, in any repo, docs repos included (owner, 2026-10-31, `~/.claude/rules/00-house-rules.md`).
The 2026-07-25 docs-deploy exception is withdrawn: a deploy or placeholder workflow found in a docs repo is
deleted and Actions switched off. Repo Actions secrets are therefore unused.

**`ahsan-notebook` is exempt from this table** — it is a private personal project on Firebase Hosting, not a
docs site. See `SKILL.md` §7 and `~/.claude/rules/docs-sites.md` §6.

## Footer / link-checker gotcha

Files emitted after MDX compilation (`/blog/rss.xml`, `/sitemap.xml`, pagefind assets) are invisible to the
broken-link checker — link them with **absolute** `SITE_URL` forms in the footer, with a comment saying why,
or `onBrokenLinks: 'throw'` fails the build on files that genuinely exist.

## Version management for the native wrapper

When the site ships as an Android app, native config lives in `trapeze.config.yaml` (bundleId, versionName,
versionCode, product name) applied with `npx trapeze run trapeze.config.yaml` (`--dry-run` to check) — never
hand-edit gradle/plist for values trapeze owns. See `theming-auth-capacitor.md`.

## Sitemap, feed and the four routes (every docs site; added 2026-10-12)

A docs site is a frontend, so it ships `/sitemap`, `/sitemap.xml`, `/feed` and `/feed.xml` like every other
(`rules/project-config.md`; the contract is `aoneahsan-cccs-sitemap`). The reference implementation is
`aoneahsan/rentparty-docs` at `db17e38` (`plugins/site-pages.ts`, `src/components/SitemapPage`, `src/components/FeedPage`,
`src/theme/BlogListPage`). It is public, so read it there.

- **A lastmod on every URL.** `lastmod: 'date'` takes each doc's git date; `blog.showLastUpdateTime: true` gives
  posts theirs. `createSitemapItems` fills the rest from what a page lists:
  - `/sitemap` takes the newest date of every page;
  - `/feed` and the blog list take the newest post's;
  - a category index takes the newest of the pages under its path;
  - and it **throws** on a URL still undated.

  The deploy workflow's checkout needs `fetch-depth: 0`, or every git date collapses to the last commit's.
  - 🔴 **A `generated-index` category lives at `/category/<slug>`, not above its pages** (`docs/guides/…` → `/guides/…`),
    so "newest page under its path" finds nothing and `withLastmod` throws. Pass an explicit map,
    `withLastmod(items, BLOG_PATH, { '/category/guides': '/guides' })`, and keep the indexed URLs (strata-storage-docs,
    2026-10-30).
  - **Node 26 prints `ExperimentalWarning: localStorage is not available …` during the SSG step** (Docusaurus core's
    `eval` copies every global). The build must be warning-free: `"build": "NODE_OPTIONS=--no-experimental-webstorage
    docusaurus build"` (Node 24 and 26 accept it), recorded as a workaround in the repo's `docs/PACKAGES.md`.
  - **Minified output (`@docusaurus/faster`) writes attributes unquoted** (`rel=canonical`, `name=description`): any grep
    over `build/` or the live site must make quotes optional.
- **A local plugin builds the two pages.** `allContentLoaded({ allContent, actions })` reads the docs (title,
  description, permalink, front-matter tags with their `tags.yml` labels, sidebar order) and the posts.
  `actions.createData` writes them once, and `actions.addRoute` adds `/sitemap` and `/feed` as exact routes with that
  data as a module (Docusaurus 3.6 or later has `allContentLoaded`). Both routes then appear in `sitemap.xml` on their
  own.
- **`/feed.xml` is written in `postBuild`** as a copy of `blog/rss.xml`, in four steps:
  - its `atom:link rel="self"` names `/feed.xml`;
  - its `xml-stylesheet` href becomes absolute (`/blog/rss.xsl`);
  - the Atom namespace is declared;
  - `blog/rss.css` is copied to the root, because the XSL loads its CSS by a relative address.

  🔴 Docusaurus runs every plugin's `postBuild` at once, so wait until the blog's `rss.xml` is complete before
  reading it.
- **The `/sitemap` page:**
  - the machine files at the top (`sitemap.xml`, `feed.xml`, RSS, Atom, `llms.txt`), each a `pathname:///…` link
    with a one-line hint;
  - the skill's typo-tolerant search, kept in `?q=` with replace;
  - the groups in sidebar order, an icon each;
  - cards with title, description and tag chips;
  - prerendered, so the whole list reads with no script.

  GitHub Pages answers `/sitemap` with `sitemap.xml` until a `sitemap.html` exists. Once the page is built, `/sitemap`
  serves the HTML (checked live, 2026-10-12).
- **A category per feed item:** give every post a tag (in `blog/tags.yml` when `onInlineTags: 'throw'`), so RSS
  and Atom items carry `<category>`.
- **The blog list's `<h1>`:** the classic theme's `BlogListPage` draws none. Eject it (`docusaurus swizzle
  @docusaurus/theme-classic BlogListPage --eject --danger`), add a header with `<h1>` = `metadata.blogTitle` and the
  blog description, delete any unchanged file the eject copied, and recheck it on every Docusaurus upgrade.
- **A typecheck that sees the code:** a template `tsconfig.json` that includes only the config and sidebars checks
  nothing in `plugins/` or `src/`.
  - Include both folders.
  - Set `types: ["node", "@docusaurus/module-type-aliases", "@docusaurus/theme-classic"]` and
    `paths: { "@site/*": ["./*"] }`. TypeScript 6 refuses `baseUrl`; `paths` resolves from the config's folder
    without it.
  - Declare `@docusaurus/module-type-aliases` and `@docusaurus/plugin-content-blog` as devDependencies at the site's
    Docusaurus version.
  - Watch the typecheck fail once on a planted error in a component.
- **Verify live** with `aoneahsan-cccs-sitemap` → [its verification checklist](../../aoneahsan-cccs-sitemap/references/verification.md) (every URL 200, canonical, indexable
  and dated; an unknown path 404).

## The four routes checklist (moved verbatim from SKILL.md §5, 2026-11-02)

🔴 **Every docs site ships `/sitemap`, `/sitemap.xml`, `/feed` and `/feed.xml`**, like every frontend:
- a lastmod on every sitemap URL, with no changefreq or priority;
- the two pages built by a local plugin;
- `/feed.xml` copied from the blog's RSS;
- a category on each feed item;
- the blog list's `<h1>`, which the theme omits.
