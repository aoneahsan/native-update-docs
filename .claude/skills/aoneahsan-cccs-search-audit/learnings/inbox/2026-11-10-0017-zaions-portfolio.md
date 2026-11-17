# Learning inbox — zaions-portfolio, search audit 2026-11-10-0017

1. **Lying probe (SA-P03 `assets`).** The asset grep `<meta[^>]*(og:image|twitter:image)[^>]*>` also matches
   `og:image:alt`, so its `content` ("Zaions: from idea to …") is fetched as a relative URL and reported 404.
   Fix for `probes.md`: match `property=["']?(og:image|twitter:image)["']?` exactly (or `og:image(:secure_url)?`),
   never the bare prefix. Seen on zaions.com; any site with `og:image:alt` lies the same way.
2. **New pattern candidate (SA-P06 variant): internal Markdown published by a docs site.** A fleet file such as
   `docs/PACKAGES.md` placed in the Docusaurus docs folder becomes a public page (`/PACKAGES`) and a sitemap URL.
   Probe: `grep -E '/(PACKAGES|MANUAL-TASKS|PENDING-TASKS|CHANGELOG-INTERNAL)' locs.txt`. Fix: add each fleet file to
   the docs plugin `exclude` list. Fleet-wide check worth adding to the catalogue.
3. **Docs four routes on a blog-less site:** `smsapp-docs/src/plugins/site-pages.ts` ports cleanly; grouping must
   follow the site's own `sidebars.ts` (zaions has one curated sidebar + a Compare category). GitHub Pages serves
   `/sitemap` as the XML until `sitemap.html` exists (confirmed again).
4. **IndexNow on a docs subdomain needs its own key file** (keyLocation must be on the submitted host): the docs
   site 404'd the key until `static/<key>.txt` was added.
5. **AI bot policy vs noindex:** the policy's "private routes disallowed in every group" and its note "disallowing a
   noindex page hides the noindex" read as a conflict for admin routes. Applied: admin/sign-in are private, so
   Disallow in every group (they also answer `X-Robots-Tag: noindex` and are in no sitemap). Clarify in
   `ai-bot-policy.md` that the noindex caveat is for public pages kept out of results, not private routes.
6. **Cloudflare Pages trade-off (new pattern candidate):** with real 404s for database-backed segments (segment
   `404.html` shell), a record published after the last deploy answers 404 until a rebuild. Check: publish date of
   the newest DB row vs the deploy time, and `curl -o /dev/null -w '%{http_code}'` on its URL.
