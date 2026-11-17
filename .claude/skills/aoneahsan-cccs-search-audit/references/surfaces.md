# Surfaces — what to check for each kind

Find a project's surfaces from:
- `project-live-urls.json` (`liveUrl`, `docsUrl`, `playStoreUrl`, `chromeStoreUrl`, `npmUrl`);
- its root `CLAUDE.md`;
- the nested repos in its root container.

Every surface that has an origin gets the full SA catalogue (`issue-catalogue.md`). The rows below add what is
specific to each kind. The owning skill carries the "how".

## Web app / marketing origin (Vite, TanStack Router, prerendered)

| Check | Pass condition | Owning skill |
|---|---|---|
| Static HTML per public route | words, title, description and one canonical in raw HTML; no empty shell | `-postbuild-seo-html` |
| Route registry is the single source | sitemap, `/sitemap`, prerender and robots come from one list; `indexable:false` routes are excluded and noindex | `-sitemap` |
| Four discovery routes | `/sitemap`, `/sitemap.xml`, `/feed`, `/feed.xml` answer, are footer-linked and carry a `Sitemap:` line | `-sitemap`, `-feed` |
| Unknown paths | real 404 on the deployed host (Cloudflare `404.html` plus route coverage; Firebase prefix rewrites) | `-sitemap` |
| JSON-LD | Organization/WebSite on home; SoftwareApplication with real offers from the plan registry; FAQ only for visible FAQs | `-react-seo` (its checklist reference) |
| Public layouts | home, legal, about, contact, `/sitemap` and `/feed` use the public layout even when signed in (workspace rule) | `-react` |
| Signed-in routes | dashboard, settings, account and admin are noindex, out of the sitemap, and Disallowed in every robots group | `-search-indexing` |
| Outbound links | ours do-follow, others nofollow, checked in the crawler-visible HTML | `-react-seo` |
| `llms.txt` / `pricing.md` | real text, v2 shape, facts equal the plan registry | `-react-aeo` |

## Docs site (Docusaurus on GitHub Pages)

| Check | Pass condition |
|---|---|
| Canonical | 🔴 no canonical in `headTags` (SA-P01); the theme's per-route canonical only |
| `themeConfig.image` | the file exists in `static/`, is 1200×630 PNG and is absolute in the output (SA-P03) |
| Sitemap | `ignorePatterns` covers `/search` (SA-P06); lastmod truthful; no changefreq/priority |
| Feed pair | blog RSS copied to `/feed.xml`, plus a `/feed` page (SA-P05) |
| Generated pages | every category has `link.description` (SA-P13) |
| `llms.txt`, robots | in `static/`, text MIME; robots uses the allow-all policy with the private guard repeated |
| 404 | GitHub Pages serves `404.html` with status 404 |
| Domain | from the project's verified domain (`-docusaurus` §1) |

## npm package

| Check | Pass condition |
|---|---|
| `package.json` | `description` is one factual sentence; `keywords` are real search terms; `homepage` = docs site; `repository` and `bugs` set; `license` |
| npm page | `https://www.npmjs.com/package/<name>` answers; the README renders (images use absolute URLs); badges resolve |
| README | follows `-npm-package-readme`; the first paragraph says what it is and who it is for (answer-first); docs link |
| Docs site | the docs row above, plus an AI-integration page and `llms.txt` naming the install line and the main API |
| Consistency | version, peer deps and capability claims agree across npm, README, docs and `llms.txt` (AI-05) |

## Browser extension

| Check | Pass condition |
|---|---|
| Store listings | Chrome, Edge and Firefox listing URLs answer; the name and short description agree with the website (AI-05). Copy edits are owner console tasks |
| Website pages | the extension's marketing site gets the web app rows; the connect page is noindex and out of the sitemap |
| Install/update pages | in-extension only (post-install law): no public duplicate indexed |

## Android (Capacitor)

| Check | Pass condition |
|---|---|
| Play listing | live per `-store-presence`; the title and short description agree with the website (AI-05) |
| `/.well-known/assetlinks.json` | 200 `application/json` with the release SHA-256 when the app declares App Links |
| Website | links to the real listing; SoftwareApplication JSON-LD names `operatingSystem: Android` only if the app is live |

## Backend / API origins (Supabase, Laravel, existing Workers)

| Check | Pass condition |
|---|---|
| API hosts | not in any sitemap; JSON endpoints send `X-Robots-Tag: noindex` where the host serves HTML at all |
| OpenAPI | public `/openapi.json` only when the API is public by intent; docs link to it |
| Edge function URLs | never linked from public pages as content |

## Surfaces that do not exist

Mark them NA with the evidence (for example "no docs site in `project-live-urls.json`, no `*-docs` repo in
the root"). 🔴 Never create a new surface (a docs site, extension or Android build) inside a search audit.
Held items stay held (`project-completion.md`).
