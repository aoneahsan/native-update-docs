# Baseline — the 2026-10-26 GSC audit, mapped to production projects

- **Source, verbatim:** `~/Documents/01-code/production-projects/search-audit-owner-handoff/gsc-audit-2026-10-26/`.
  Per-project detail is in its `projects/<name>.md|json`, the root supplement in
  `root-submitted-origins-issues-2026-10-26.json`, and the soft-404 rechecks in `SOFT404-RECHECK.md`,
  `soft404-current-classification-2026-10-26.json` and `LIFEWELL-LEGACY-URL-CLASSIFICATION-2026-10-26.md`.
- **Classification:** owner, 2026-10-27; frozen per `projects-finalization-record/idea-projects/freeze-ledger.json`.
- A run starts by reproducing its project's records. A record may already be fixed (the "2026-10-27
  re-probe" column), so reproduce it before fixing and never assume.

## Production projects

| Root | Original record IDs | SA patterns | 2026-10-27 re-probe |
|---|---|---|---|
| achat-root | `BEM-SEARCH-ACHAT-SOCIAL-IMAGE-MARKETING` · `BEM-SEARCH-ACHAT-CANONICAL-HOME` · `BEM-SEARCH-ACHAT-FEED-DOCS` | P03 P01 P05 | — |
| aoneahsan-portfolio-root | `BEM-SEARCH-AONEAHSAN-PORTFOLIO-SITEMAP-WEB` (cleared: `/payment` deliberate) | P06 cleared | — |
| callvault-root | `BEM-SEARCH-CALLVAULT-SITEMAP-DOCS` | P06 | — |
| capacitor-auth-manager-root | `BEM-SEARCH-CAPACITOR-AUTH-MANAGER-CANONICAL-HOME` · `…-FEED-DOCS` | P01 P05 | — |
| clearhire-project-root | `BEM-SEARCH-CLEARHIRE-SITEMAP-WEB` (`/search`, classify) | P06 | — |
| empora-root | `BEM-SEARCH-EMPORA-001` (source: docs `docusaurus.config.ts:32`) · `…-SITEMAP-DOCS` · `…-FEED-DOCS` | P01 P06 P05 | P01 still FAIL |
| fileshub-root | `BEM-SEARCH-FILESHUB-FEED-DOCS` (old docs canonical defect NOT reproduced on 60 pages; do not re-fix) | P05 | P01 PASS |
| growthify-root | `BEM-SEARCH-GROWTHIFY-CANONICAL-HOME` · `…-FEED-DOCS` | P01 P05 | — |
| habitforge-project-root | `BEM-SEARCH-HABITFORGE-DESCRIPTION-CATEGORY` (4 docs category pages) | P13 | — |
| labflow-project-root | `BEM-SEARCH-LABFLOW-SITEMAP-WEB` (`/login`, `/register`) | P06 | still FAIL |
| lifewell-project-root | `BEM-SEARCH-LIFEWELL-001` (docs `docusaurus.config.ts:246`, `img/social-card.png` 404) · `LIFEWELL-LEGACY-FEATURE-SHELL-20261026` · 15 historical URLs | P03 P11 | og image still 404; both feature slugs now **404** |
| nativeupdate-root | earlier docs `/search` hold stale (absent from XML) | P06 | — |
| pregnancypal-root | `BEM-SEARCH-PREGNANCYPAL-FEED-DOCS` | P05 | — |
| rentparty-root | `BEM-SEARCH-RENTPARTY-SOCIAL-IMAGE-DOCS` | P03 | — |
| slackvault-root | `BEM-SEARCH-SLACKVAULT-CANONICAL-HOME` · `…-FEED-DOCS` | P01 P05 | — |
| smsapp-root | `BEM-SEARCH-SMSAPP-SITEMAP-WEB` (`/login`) · `…-SITEMAP-DOCS` · `…-FEED-DOCS` | P06 P05 | unknown path answers **200** (P11) |
| strata-storage-root | `BEM-SEARCH-STRATA-STORAGE-FEED-MARKETING` · `…-LLMS-OPTIONAL` · `…-CANONICAL-HOME` · `…-FEED-DOCS` | P05 P04 P01 | llms still HTML; unknown path **200** (P11) |
| taxease-project-root | `BEM-SEARCH-TAXEASE-SITEMAP-DOCS` · `…-FEED-DOCS` (web `/search` cleared) | P06 P05 | — |
| trizlink-project-root | `GSC-TRIZLINK-OWNERSHIP` (both properties unverified) | P17 | owner task |
| vcpeai-root | `BEM-SEARCH-VIDEO-CONTROLS-PLUS-SITEMAP-WEB` (`/dashboard`; `/settings` cleared) · 6 historical soft-404s (5 intentional 301 retirements, 1 has content) | P06 P11 | — |
| windowsweep-root | `BEM-SEARCH-WINDOWSWEEP-SITEMAP-DOCS` · `…-FEED-DOCS` | P06 P05 | — |
| zaions-portfolio-root | `BEM-SEARCH-ZAIONS-PORTFOLIO-SITEMAP-WEB` (cleared: `/payments`) | P06 cleared | — |
| ztools-root | `BEM-SEARCH-ZTOOLS-SITEMAP-DOCS` · `…-FEED-DOCS` · `BEM-ROOT-TOOLS-SUBMITTED-SITEMAP-404` (`tools.zaions.com` is ZTools, owner 2026-10-27) · 4 tool URLs answered **403** to the audit | P06 P05 P12 P19 | the 4 URLs answer 200 now; sitemaps.xml still 404 |
| waylock-root · linkedin-posts-automation-root · zaions-engine | not in the audit | all | full pattern run |

- `netcage-docs` was audited ("no defect observed") but has no root here. Ask the owner which project
  owns it.
- Any other host a project's records name that is not in its registry row is an owner question.

## Non-production: record only, never worked

The full register, with every record → pattern, is in
`search-audit-owner-handoff/reports-for-dot-agent/00-session-reports/NON-PRODUCTION-REGISTER.md`.

| Group | Hosts |
|---|---|
| Frozen idea projects | 2fastudio, aipa, contentsynergy, forgeai (+docs), interviewpai, learnqai, shopnest (+docs), imtehanhub (+docs), snapcontact (+docs), unified-error-handling-docs, unified-tracking-docs, webauthn-server-buildkit-docs, wbamai (+docs), exohunterai, shieldpro, chatgpteai, gamenight (the last two confirmed frozen by the owner, 2026-10-27) |
| Protected | legaleaglelaws (`protected-repos.md`) |

These hosts show patterns P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P14, P15, P16 and P18. Every one
of them is run in every production project.
