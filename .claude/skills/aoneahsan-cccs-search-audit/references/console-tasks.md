# Console tasks — rows for `docs/MANUAL-TASKS.md`

Consoles are the owner's (decision 2026-10-27). The agent prepares exact, copy-ready rows and never signs in.
Append them to the project's `docs/MANUAL-TASKS.md` ⏳ Pending table. Tick one off only when the owner confirms
it done, then in the same turn without asking (`manual-tasks.md`). Each row links back to the run report.

| Need | Row text (fill in the brackets) |
|---|---|
| Obsolete sitemap submitted | GSC → property `[sc-domain:…]` → Sitemaps → remove `[old URL]`, submit `[https://host/sitemap.xml]`. Our redirect/file is live since `[commit]` |
| Sitemap after a fix | GSC → Sitemaps → open `[url]` → "Resubmit" only if the last read predates `[deploy date]` (resubmitting a healthy sitemap changes nothing) |
| Fixed indexing reason | GSC → Page indexing → `[reason]` → "Validate fix" after `[deploy date]`. Examples fixed: `[URLs]` |
| Canonical fix | GSC → URL Inspection → `[2–3 URLs]` → Test live URL → confirm "User-declared canonical" = the URL; then Request indexing |
| robots fetch failed | GSC → Settings → robots.txt → `[host]` → "Request a recrawl"; record the date and result |
| Unverified property | GSC → add `[sc-domain:host]` → copy the TXT record → DNS `[provider]` → Verify (the token is never guessed into HTML) |
| Bing | Bing Webmaster → import from GSC (first time) → Sitemaps → `[url]`; AI Performance report → note citations for `[host]` |
| Play / store copy | `[store]` console → listing → change `[field]` to the approved text in `[path]` |

**Rows already known from the 2026-10-26 baseline:**
- **ZTools.** Remove `tools.zaions.com/sitemaps.xml` from the zaions.com property after the redirect ships.
- **Trizlink.** Verify `sc-domain:trizlink.com` and `sc-domain:docs.trizlink.com`.
- **Every project with a fixed P1.** Validate the fix in Page indexing after deploy.

The status stays `google-pending` in `STATUS.json` until the owner reports the console result.
