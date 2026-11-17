# Learning inbox — windowsweep, run 2026-10-30-2224 (AFTER pass 2026-11-05, fixes 2026-11-06)

One new pattern candidate, three new checks, and four probe traps.

1. **Host-move trap (probes.md header).** After a migration the auditing machine's resolver may keep answering the old
   host for hours (windows-p52 answered Firebase `199.36.158.100` all of 2026-11-05 after the Pages move). Pin every
   request to the moved origin (`--resolve host:443:<new IP>`) and prove the host by the served bundle hash and the
   `Server:` header, never by the resolver.
2. **SA-P20 candidate: the previous host keeps serving a stale copy.** Firebase default hosts (`<site>.web.app`,
   `<site>.firebaseapp.com`) serve the last Firebase deploy indefinitely; one release later they carry wrong facts
   (here `softwareVersion 1.4.1`). Detect: GET the old default hosts after a move; expect 404 once the old site is
   disabled. Fix: disable the old hosting site after the DNS cutover window, then delete its config.
3. **JSON-LD check: every node carries `@type`.** A "shared entity" fix dropped `@type` and every probe still passed
   (the `@id`, fields and version all matched). A node without `@type` is a FAIL, not a match. Build-side guard:
   windowsweep-docs `plugins/discovery-facts.ts`.
4. **AEO pricing check: grep the served pricing page for "Loading".** A pricing page whose facts arrive after
   hydration ships no price to answer engines. FAIL on any loading string or on no currency figure in the served
   HTML. windowsweep's fix: read the plan rows at build time, seed the page's query cache so the server render draws
   the cards, put the same rows in the browser cache before hydrating (`setQueryData`, dated at build time), and emit
   `offers` on that page only, each price checked against the visible text. Only prices drawn on load belong in
   `offers` (a yearly price behind a period switch failed the check, correctly).
5. **A code comment can claim an exception nobody typed.** `vite/prerender-html.ts` said "windowsweep carries a
   standing exemption from the plan-set mandate" and the build banned every `offers` on that basis. Grep for
   "exemption" / "exception" in generators; with no owner-typed block it is a finding.
6. **Windows python traps.** `open()` defaults to cp1252 (`UnicodeDecodeError` on the npm record); `print` fails on an
   emoji. Use `encoding='utf-8'` or `PYTHONIOENCODING=utf-8`. A URL list written in text mode carries `\r\n` and every
   curl then fails with `URL rejected` and `000`: `tr -d '\r'` first.
7. **The calibration set goes stale.** `stratastorage.aoneahsan.com/llms.txt` is fixed since 10-27; only
   `tools.zaions.com/sitemaps.xml` remains a live known-bad. Prefer planted strings (two canonicals, `og:image:width`,
   a robots group trap, an empty description).
8. **Pages via `hosting/pages-output.ts`:** with every private route prerendered and a root `404.html`, an empty
   `_redirects` gives real 404s for `/admin/<absent>` - the Firebase `/admin/**` glob soft-404 does not exist there.
9. **Count unique hrefs.** A "links in `#root`" count differs 2× between raw and de-duplicated anchors (10 unique vs
   22-28 raw here). Write the acceptance as unique hrefs.
10. **`vite preview` is not the host for prerendered pages.** It answers `/route` (no slash) with the home page's HTML
    when the prerender wrote `route/index.html`, so React throws hydration error #418 there. Render-check such pages
    as `route/`, or serve `dist-pages/` with `wrangler pages dev`.
11. **A machine-readable file typed by hand goes stale on the next release.** Docs `llms.txt` named `desktop-v1.4.1`
    after 1.4.2 shipped; a build-time placeholder (`__TOOL_VERSION__`) plus a build failure on any other tag closed it.
