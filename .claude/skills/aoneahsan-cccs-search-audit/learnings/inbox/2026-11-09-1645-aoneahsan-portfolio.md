# Portfolio search audit lessons — 2026-11-09-1645

## Docusaurus sitemap filters match full URLs

Seen at `aoneahsan-portfolio-docs/docusaurus.config.ts:38`: root-relative `/search` and `/tags` patterns left those pages in the generated XML. `**/search/**` and `**/tags/**` reduced the live sitemap to the nine intended content URLs. The built and live `sitemap.xml` were checked. Target: `aoneahsan-cccs-docusaurus/references/site-config.md` and `aoneahsan-cccs-search-audit/references/issue-catalogue.md`. Both were corrected during this run because the previous recipe gave a false pass.

## Search plugin robots metadata does not control crawlers

The live `/search/` page emitted `<meta property=robots content="noindex, follow">`; it lacked `name=robots`. A `SearchPage` theme wrapper added `name=robots`, and the same treatment was applied to tag indexes excluded from the sitemap. Local build and live HTML both show `name=robots`. Target: `aoneahsan-cccs-docusaurus/references/search-analytics-ai.md` and the SA-P06 catalogue entry; corrected during this run.

## Generic bot challenge is not verified-crawler evidence

On 2026-11-09, nine named crawler user agents got 200 from `https://aoneahsan.com/`, while `Python-urllib/3.12` got 403. That signals a generic automation rule but does not prove Googlebot was blocked; user-agent spoofing also cannot prove a real crawler is allowed. The existing SA-P19 acceptance test correctly requires Search Console Crawl stats. No catalogue change was made. The owner console row is `aoneahsan-portfolio/docs/MANUAL-TASKS.md` row 50.
