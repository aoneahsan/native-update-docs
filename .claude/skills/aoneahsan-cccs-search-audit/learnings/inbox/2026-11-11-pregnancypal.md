# 2026-11-11 · pregnancypal · delta run

No new SA pattern. Both hosts re-probed live: robots, sitemaps (40 and 39 URLs), feeds, real 404s, and the compare pages with `nofollow` and a dated "Last checked" in served HTML. No public words changed, so there was nothing for IndexNow.

Probe note for the catalogue: a Docusaurus `sitemap.xml` is one line, so `grep -c '<loc>'` reports 1. Count with `grep -o '<loc>' | wc -l`.
