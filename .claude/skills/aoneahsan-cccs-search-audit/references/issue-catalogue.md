# SA pattern catalogue (SA-P01…P19, AI-01…09)

Every pattern below was **observed in a real property** in the 2026-10-26 GSC + public-endpoint audit
(`~/Documents/01-code/production-projects/search-audit-owner-handoff/gsc-audit-2026-10-26/`). The record IDs
show where it was seen. A frozen-project record means the pattern still runs in every production project
to prove it absent.

Each entry: **Detect** (read-only, see `probes.md` for the shared variables) · **Fix** by stack · **Accept**.
Statuses: PASS · FAIL · NA (reason) · BLOCKED (missing input). Severity follows the audit: **P1** canonical,
discovery, availability or a non-indexable route conflict · **P2** preview, metadata, policy or route
classification · **INFO** optional. House law can raise a severity, as with the feeds in P05.

---

## SA-P01 — duplicate or global canonical on a route (P1)

- **Seen:**
  - production docs: `BEM-SEARCH-EMPORA-001`, plus homepage samples on achat, capacitor-auth-manager,
    growthify, slackvault and strata-storage;
  - frozen docs: `BEM-ROOT-*-DOCS-CANONICAL-CONFLICT` (forgeai, imtehanhub, shopnest, snapcontact,
    unified-*, wbamai, webauthn).
- **Root cause (confirmed):** a `headTags` `<link rel="canonical" href="<root>">` in `docusaurus.config.ts`
  sits beside the per-route canonical that Docusaurus emits. Empora: `docusaurus.config.ts:32`. Our own
  `-docusaurus` skill told sites to do this until 2026-10-27. The same shape appears in a SPA whose
  `index.html` hardcodes the root canonical while prerender adds a route canonical.
- **Detect:** for every `<loc>` in the sitemap, count the canonical tags and compare them to the URL (probe
  `canon-sweep`). FAIL when any page has ≠ 1 canonical, or a canonical ≠ its own final URL (unless a
  deliberate, documented duplicate).
- **Fix:**
  - **Docusaurus:** delete the canonical entry from `headTags` and keep the theme's route canonical.
  - **SPA/prerender:** remove the hardcoded canonical from `index.html` and emit one per route in the
    prerender step (`-postbuild-seo-html`).
- **Accept:** the full-sitemap sweep on the deployed site shows exactly one self-canonical per URL.

## SA-P02 — no canonical in raw homepage HTML (P2)

- **Seen:**
  - production: none;
  - frozen: `BEM-SEARCH-2FASTUDIO-HOME-CANONICAL`, `BEM-SEARCH-LEGALEAGLELAWS-HOME-CANONICAL`.
- **Detect:** `curl` the homepage (no JS) and grep `rel="canonical"`. FAIL when none is found.
- **Fix:** emit the canonical in the static HTML of every prerendered route, the home included.
- **Accept:** the raw HTML shows one canonical equal to the homepage final URL.

## SA-P03 — declared preview image or icon is broken or absent (P2)

- **Seen:**
  - production: `BEM-SEARCH-LIFEWELL-001` (docs `img/social-card.png` 404),
    `BEM-SEARCH-ACHAT-SOCIAL-IMAGE-MARKETING` and `BEM-SEARCH-RENTPARTY-SOCIAL-IMAGE-DOCS` (no og:image);
  - frozen: `BEM-ROOT-EXOHUNTERAI-DECLARED-IMAGE-RETURNS-HTML`,
    `BEM-ROOT-SHIELDPRO-DECLARED-IMAGE-RETURNS-HTML` (an image URL answered with SPA HTML).
- **Detect:** collect every `og:image`, `twitter:image`, `<link rel=icon|apple-touch-icon>` and manifest
  icon from the homepage and a page sample. GET each one. FAIL on a non-200 status, a non-`image/*` MIME, a
  relative URL in og:image, or a page with no og:image at all.
- **Fix:**
  - ship the asset at the declared path, or point the declaration at the asset that ships;
  - Docusaurus: `themeConfig.image` must exist under `static/`;
  - author an SVG master and a 1200×630 PNG (social cards cannot be SVG).
- **Accept:** every declared image is 200 with an `image/*` MIME and an absolute URL, and it was viewed.

## SA-P04 — `llms.txt` answers the HTML fallback (P2 when the file is declared or linked, else INFO)

- **Seen:**
  - production: `BEM-SEARCH-STRATA-STORAGE-LLMS-OPTIONAL`;
  - frozen: 2fastudio, aipa, forgeai, learnqai, legaleaglelaws.
- **Detect:** GET `/llms.txt`. FAIL when the response is 200 with `text/html` or an `<!doctype html` body.
  When the file is real, check AI-07.
- **Fix:**
  - **Docusaurus:** put the file in `static/`;
  - **Vite:** put it in `public/`;
  - **Cloudflare Pages:** make sure `_redirects` does not rewrite it;
  - **Firebase:** keep it out of the `**` rewrite;
  - write it in llms.txt v2 shape (`-react-aeo`).
- **Accept:** the live response is 200 `text/plain` or `text/markdown` with an H1 first line, and every
  link in it answers 200.

## SA-P05 — `/feed` or `/feed.xml` missing or answering HTML (P2: house law requires the pair everywhere, docs included)

- **Seen:**
  - production:
    - docs 404 on achat, capacitor-auth-manager, empora, fileshub, growthify, pregnancypal, slackvault,
      smsapp, strata-storage, taxease, windowsweep and ztools;
    - `BEM-SEARCH-STRATA-STORAGE-FEED-MARKETING` (HTML);
  - frozen: 2fastudio, aipa and legaleaglelaws (HTML); learnqai (historical "Sitemap is HTML").
- **Detect:** GET both. `/feed.xml` must be 200 with an XML MIME and parse as RSS 2.0 (`xmllint --noout`).
  `/feed` must be the readable page.
- **Fix:** follow `-feed`. On Docusaurus, follow `-docusaurus` → its site-config reference, "Sitemap, feed and the four
  routes" (blog RSS copied to `/feed.xml`, the `/feed` page built by a local plugin).
- **Accept:** both answer live, the XML parses, and the items carry real dates and categories.

## SA-P06 — sitemap lists auth, utility, search or private routes (P1 when the route is auth/private, else P2)

- **Seen:**
  - production:
    - `BEM-SEARCH-LABFLOW-SITEMAP-WEB` (`/login`, `/register`);
    - `BEM-SEARCH-SMSAPP-SITEMAP-WEB` (`/login`);
    - `BEM-SEARCH-VIDEO-CONTROLS-PLUS-SITEMAP-WEB` (`/dashboard`; `/settings` was cleared as a public
      preferences page);
    - `BEM-SEARCH-CLEARHIRE-SITEMAP-WEB` (`/search`);
    - docs `/search` on callvault, empora, smsapp, taxease, windowsweep and ztools;
  - frozen: 2fastudio, contentsynergy, forgeai, interviewpai.
  - Cleared as deliberate: aoneahsan.com `/payment`, zaions.com `/payments`, ztools `/search`, taxease web
    `/search`.
- **Detect:** extract the `<loc>` paths and match them against
  `/(login|signin|sign-in|register|signup|sign-up|auth|dashboard|account|admin|settings|search|logout|reset|verify|onboarding|checkout|connect)(/|$)`.
  Each match is classified: does the page give a public visitor useful, unique content? Record the decision
  with its reason; routes the audit already cleared stay cleared.
- **Fix:**
  - drop the route from the sitemap generator (route registry flag `indexable:false`);
  - give it `<meta name="robots" content="noindex">`;
  - 🔴 do not `Disallow` it as well, or crawlers never see the noindex (`-search-indexing`);
  - Docusaurus: `sitemap: { ignorePatterns: ['**/search/**', '**/tags/**'] }` because the plugin matches full URLs, plus the search and tag pages' `name=robots` noindex
    (search-local already emits one; verify it). 🔴 Verified wrong 2026-10-28 (Rent Party, SA-RENTPARTY-001):
    `@easyops-cn/docusaurus-search-local` 0.55.3 writes `<meta property="robots" content="noindex, follow">`
    (`SearchPage.jsx:85`), which search engines do not read as a robots rule, so `/search` stays indexable. Wrap the page
    (`src/theme/SearchPage/index.tsx`: `@theme-original/SearchPage` inside a `<Head>` carrying
    `<meta name="robots" content="noindex, follow">`). Wrap `DocTagsListPage` and `DocTagDocListPage` the same way when tags are excluded. Probe for `name=` (`grep -o '<meta[^>]*name=robots[^>]*>'`), never
    for the word `robots` alone.
- **Accept:** the live sitemap has no unclassified utility route, and each excluded route serves noindex.

## SA-P07 — a named robots group drops the private Disallows (P2)

- **Seen:**
  - production: none observed;
  - frozen: 2fastudio, contentsynergy, forgeai, interviewpai, learnqai, exohunterai, imtehanhub, shieldpro,
    snapcontact, wbamai.
- **Cause:** a crawler obeys only its most specific `User-agent` group (`-react-seo` group trap), so
  `User-agent: GPTBot / Allow: /` opens `/admin` to that bot.
- **Detect:** probe `robots-effective`. For every named group, compute access to each private prefix that
  `*` disallows. FAIL when any named group may fetch a private prefix.
- **Fix:** generate robots from one helper that writes every group with the same private Disallow block.
  The bot list and policy are in `ai-bot-policy.md`.
- **Accept:** every listed bot is allowed `/` and denied every private prefix (probe output attached).

## SA-P08 — wrong-host discovery signals (P1)

- **Seen:**
  - production: none observed;
  - frozen: `BEM-SEARCH-AIPA-WRONG-HOST-DISCOVERY` (canonical, og:url and sitemap all on aoneahsan.com),
    `BEM-ROOT-SHIELDPRO-SITEMAP-HOST-MISMATCH`, `BEM-ROOT-CHATGPTEAI-SITEMAP-HOST-MISMATCH`.
- **Cause:** a copied template or a shared `SITE_URL` env value.
- **Detect:** FAIL when the canonical, `og:url`, a sitemap `<loc>`, a robots `Sitemap:` line or a JSON-LD
  `url`/`@id` names a host other than the page's own, except an intended sibling (the docs sitemap listed in
  app robots).
- **Fix:** read the origin from the project's own config, one value, and make the build fail when it
  disagrees with `project-live-urls.json`.
- **Accept:** every signal is on its own host, live.

## SA-P09 — host typo in the robots `Sitemap:` line (P2)

- **Seen:** frozen `BEM-ROOT-FORGEAI-DOCS-ROBOTS-SITEMAP-HOST-TYPO`.
- **Detect:** GET every `Sitemap:` URL in robots. FAIL on anything that is not 200 XML.
- **Fix:** generate the line from the same origin constant. **Accept:** each line fetches valid XML.

## SA-P10 — `robots.txt` or `sitemap.xml` served as HTML (P1)

- **Seen:** frozen/protected `BEM-SEARCH-LEGALEAGLELAWS-DISCOVERY-HTML-FALLBACK`.
- **Detect:** FAIL when robots is not `text/plain` or the sitemap is not XML-typed and parseable.
- **Fix:** ship the files and exclude them from the SPA rewrite (host table in `-sitemap`).
- **Accept:** correct MIME and a parseable body, live.

## SA-P11 — unknown route returns 200 with the homepage shell (soft 404) (P2; P1 when listed or linked)

- **Seen:**
  - production: `LIFEWELL-LEGACY-FEATURE-SHELL-20261026` (`/features/heart-rate-zones` and a second absent
    slug); the historical soft-404 sets for LifeWell (15), ZTools and VCPEAI
    (`soft404-current-classification-2026-10-26.json`).
- **Detect:**
  - GET `/<random-uuid>` and an absent child of every dynamic route family (`/features/<bogus>`,
    `/tools/<bogus>`, `/blog/<bogus>`);
  - FAIL on a 200 whose title or canonical is the homepage's;
  - re-check each historical soft-404 URL from the baseline as well.
- **Fix:**
  - the host must answer a real 404 for unknown paths (`-sitemap` host table: Cloudflare `404.html` plus route
    coverage, Firebase prefix-only rewrites);
  - a retired URL with a true successor gets a 301 to it;
  - 🔴 never redirect all unknown URLs to home;
  - the not-found page is `noindex`, with no canonical.
- **Accept:** a bogus path answers 404 live, each retired URL is 301 to a relevant page or 404/410, and every
  baseline URL has a recorded classification.

## SA-P12 — obsolete sitemap still submitted in a console (P2, owner task + our redirect)

- **Seen:**
  - production: `BEM-ROOT-TOOLS-SUBMITTED-SITEMAP-404` (`tools.zaions.com/sitemaps.xml`; tools.zaions.com is
    ZTools, owner 2026-10-27);
  - frozen: `BEM-SEARCH-2FASTUDIO-HISTORICAL-HOST-ERROR` (old `2fastudio.app` URLs).
- **Detect:** the console list cannot be read (owner only). Check every sitemap URL the baseline says was
  submitted.
- **Fix:**
  - where the host is ours, serve a 301 from the wrong path to the real sitemap, or the real file;
  - add a `MANUAL-TASKS` row to remove the obsolete submission and submit the right one
    (`console-tasks.md`).
- **Accept:** the wrong URL redirects or 404s by intent, the right one is 200 XML, and the owner row exists.

## SA-P13 — generated docs pages without a meta description (P2)

- **Seen:** production `BEM-SEARCH-HABITFORGE-DESCRIPTION-CATEGORY` (4 generated category pages).
- **Detect:** in the sitemap sweep, FAIL on any page whose `<meta name="description">` is missing or empty.
- **Fix:**
  - Docusaurus categories: `_category_.json` → `link: { type: 'generated-index', description: '…' }`;
  - docs pages: a `description` in front matter;
  - the words go through the story system.
- **Accept:** zero pages without a description in the full sweep.

## SA-P14 — historical robots fetch failure in GSC (INFO → owner recheck)

- **Seen:** frozen: `GSC-ROBOTS-CONTENTSYNERGY`, `GSC-ROBOTS-INTERVIEWPAI` ("Not Fetched - N/A").
- **Detect:**
  - robots is 200 `text/plain` from several fetches;
  - there is no WAF or bot challenge for a Googlebot UA (a spoofed UA proves nothing about real crawler
    access, so record it as a hint);
  - DNS resolves.
- **Fix:** none without evidence. Add an owner row to recheck Settings → robots.txt.
- **Accept:** a later console fetch succeeds, recorded by the owner.

## SA-P15 — old domain still in Google (P2)

- **Seen:** frozen 2fastudio (`2fastudio.app`).
- **Detect:** the project's old hosts (its `CLAUDE.md`, the registry `note`) still answer.
- **Fix:** a 301 host redirect where we control DNS; otherwise an owner row. **Accept:** old URL → 301 → new.

## SA-P16 — the whole origin is unavailable (P1)

- **Seen:** frozen `BEM-SEARCH-SHOPNEST-PUBLIC-ENDPOINTS-404`.
- **Detect:** home, robots and sitemap are all non-200.
- **Fix:** an owner question (production intent). A retired product gets a deliberate retirement page or
  410 plus console removal.
- **Accept:** the state matches the owner's decision.

## SA-P17 — GSC property unverified (BLOCKED → owner task)

- **Seen:** production `GSC-TRIZLINK-OWNERSHIP` (`sc-domain:trizlink.com`, `sc-domain:docs.trizlink.com`).
- **Fix:** add an owner row with the DNS-TXT verification steps (`-search-indexing`). Never guess a token.

## SA-P18 — homepage access limited (INFO)

- **Seen:** frozen `BEM-ROOT-GAMENIGHT-HOMEPAGE-ACCESS-LIMITED`.
- **Detect:** home answers 401/403, a login wall or a challenge to an anonymous GET. FAIL only when the
  owner's intent is "public".

---

## AI-01…AI-09 — answer-engine checks (from `gsc-audit-2026-10-26/ai-search-audit-guidance-2026-10-26.md`)

| ID | Check | FAIL when |
|---|---|---|
| AI-01 | Effective robots for Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User, GPTBot, ClaudeBot and Google-Extended on every intended public route | any public route is denied to a bot the policy allows, or a private route is open (`ai-bot-policy.md`) |
| AI-02 | Status, redirects, MIME, visible text in raw HTML, response headers on canonical pages | an error, login, challenge or empty shell; ordinary HTTP evidence is kept apart from real-crawler evidence |
| AI-03 | meta robots, named-bot meta, `X-Robots-Tag`, `nosnippet`, `max-snippet`, `noarchive`, `nocache` | an unintended exclusion; a deliberate one is preserved and recorded |
| AI-04 | Training-bot policy is mapped to Google-Extended, GPTBot and ClaudeBot | it differs from the owner policy (allow all, 2026-10-27) |
| AI-05 | Product name, one-line description, features, price and availability agree across app, docs, JSON-LD, `llms.txt`, store listing and npm README | any field conflicts; record exact page + field and fix the source of truth (`-react-aeo`) |
| AI-06 | `submitted / processed / indexed / cited` evidence is kept distinct | a report claims a later state from an earlier one |
| AI-07 | `llms.txt` is real Markdown, v2 shape, accurate, links 200, no private routes, freshness matches content | broken, misleading or stale |
| AI-08 | OG/social metadata is judged separately from indexing (SA-P03) | — |
| AI-09 | Console access and ownership are known per property | unknown → owner row |

Plus, for answer quality (`-react-aeo`, `-seo-content-writing`):
- an answer-first first paragraph on key public pages;
- question-shaped H2s where the page answers questions;
- FAQ/HowTo/SoftwareApplication JSON-LD only when it matches the visible content;
- a public pricing page whose plan facts match the plan registry.

## SA-P19 — the CDN answers 403 or a challenge to crawler-like traffic (P1 when it is real-crawler evidence, else P2)

- **Seen:** production ZTools. Four tool URLs answered **403** to the GSC agent's public audit on 2026-10-26
  (`soft404-current-classification-2026-10-26.json`, "access_limited") and **200** to three user agents
  on 2026-10-27. This fits a Cloudflare rate limit, Bot Fight Mode or a security-level challenge on bursts.
- **Detect:**
  - a single GET per URL with several UAs at the normal pace; never burst-test our own site;
  - read the GSC Crawl stats host status and the "Blocked due to access forbidden (403)" reason when the owner
    exports them;
  - check the project's Cloudflare security settings (the API token in the vault, read only).
- **Fix:**
  - verified bots must be allowed: a WAF skip rule for `cf.client.bot`, and Bot Fight Mode off or Super
    Bot Fight with verified bots allowed;
  - any rate limit must exclude verified crawlers;
  - a settings change is an owner row unless the project already automates Cloudflare config.
- **Accept:** no 403 or challenge for verified crawlers in GSC Crawl stats after the change (`google-pending`
  until the owner confirms).

## Adding a pattern

The next free ID is **SA-P20**. Add it through the learning loop (`learning-loop.md`): seen-in, cause, detect,
fix, accept. Never renumber an ID.
