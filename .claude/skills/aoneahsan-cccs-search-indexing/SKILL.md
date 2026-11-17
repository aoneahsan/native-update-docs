---
name: aoneahsan-cccs-search-indexing
description: "Getting finished pages actually indexed: owning the Search Console, Bing and Yandex properties with verification tokens collected not guessed, supported submission channels, the GSC triage ladder with honest timescales, why noindex, canonical and Disallow are not interchangeable, and verifying canonicals in the BUILT output. Use when submitting a site to search engines, when GSC reports pages not indexed, when the indexed count drops, or before a launch or domain move."
metadata:
  author: aoneahsan
  source: rules-detail/seo-aeo-ranking.md §1 + §3 + §7 + §9, urls/bing-seo.md, habitforge W1 phase05
---

# Search indexing

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" first. It supersedes
older numerical examples and unsupported provider claims in this skill and its references.

**Submitting a sitemap is not ranking, and it is not even indexing.** This skill is the operational half:
owning the properties, pushing what can be pushed, reading what the engines report back, and knowing which of
the three suppression mechanisms you actually meant.

`-react-seo` owns the four-step funnel diagnosis and per-page metadata. Come here once the pages exist.

## Own the properties first

| Engine                    | Property                                                    | Note                                                                                            |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Google Search Console** | **domain** property, verified by DNS TXT                    | a URL-prefix property splits `www`, `https` and subdomains into separate, half-blind properties |
| **Bing Webmaster Tools**  | currently supported site property and optional IndexNow key | read current access, quota and relationship evidence from official sources                      |
| **Yandex Webmaster**      | currently supported site property                           | add only when the project rollout gate and target market require it                             |

🔴 **Never guess a verification token into HTML.** Generate the values the engines ask for, write them to
**`docs/seo-verification.md`** for the owner to place, and record which are confirmed. A wrong token fails
silently and reads exactly like "the engine has not crawled us yet".

## Supported notification channels

Google's Indexing API supports only its documented page types; ordinary pages use discovery mechanisms and
the manual Search Console request when applicable. 🔴 Owner, 2026-10-27: IndexNow goes out automatically
after live verification, and console steps are owner rows (`/search-audit`). Verify current IndexNow consumers and protocol behavior
before wiring changed or deleted URLs into deployment. A successful notification is not an indexing verdict.

## 🔴 The canonical is the expensive one to get wrong

**habitforge, W1 phase05:** `index.html` hardcoded `rel="canonical"` at the site root while eight routes
intended distinct canonicals. Search Console observations must confirm how Google selected and treated each
URL; the source mismatch alone does not prove the provider outcome.

**Verify per route in the BUILT output**, not in the source and not in the dev server:

```bash
grep -o '<link rel="canonical" href="[^"]*"' dist/**/index.html   # one self-referential URL per page
```

Compare static and rendered canonicals with the target crawler's current capabilities. The intended canonical
must be present in the representation being verified (`-postbuild-seo-html`).

## noindex, canonical and Disallow are three different tools

| You mean                         | Use         | The trap                                                                                                                                                          |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "do not list this page"          | `noindex`   | 🔴 **`Disallow` where `noindex` was meant blocks the crawl, so the engine never SEES the noindex** — the URL may remain indexed without that directive being read |
| "this is a duplicate of that"    | `canonical` | a canonical is a _hint_; Google may choose a different canonical; inspect the outcome                                                                             |
| "do not spend crawl budget here" | `Disallow`  | it says nothing about indexing                                                                                                                                    |

Legitimate `noindex` targets are pages whose recorded intent excludes them from search. Weak public pages
need an evidence-backed intent decision: improve, consolidate, redirect, remove or `noindex`.

## Triage, and honest timescales

Each GSC state starts an evidence-led diagnosis; the ladder, the wait each one deserves, and the per-state expectation live in
**`references/triage.md`**. The headline: _Crawled – currently not indexed_ does not by itself explain the cause; inspect rendering,
indexability, canonical selection and content purpose before prescribing a fix.

## Monitor on the recorded cadence

Compare indexed-page counts, queries and reason breakdowns with the same scope and date basis. A drop starts
an evidence-led investigation; it does not establish a cause. The submission runbook, domain-move sequence
and monitoring record live in **`references/submission.md`**.

## 🔴 SEARCH-DISCOVERY — the queue the runner writes, and the loop that closes it

`~/Documents/01-code/google-search-console-automation` audits a project's search surfaces and writes its
findings to **`SEARCH-DISCOVERY-ISSUES.md` at that project's repository root**. It reports and it verifies;
it **never** changes application code. Closing a finding is the project's own work.

🔴 **Two files, and a fixed finding MOVES between them** (owner directive 2026-09-08):

| File                               | Holds                                                              |
| ---------------------------------- | ------------------------------------------------------------------ |
| `SEARCH-DISCOVERY-ISSUES.md`       | **OPEN findings only** — a worklist. Committed, never gitignored   |
| `SEARCH-DISCOVERY-FIXED-ISSUES.md` | history — an entry moves here on a **deployed, live-verified** fix |

**The loop:** fix → **deploy** → prove it on the **LIVE** surface → move the entry verbatim into the fixed file
with its markers → delete it from the issues file → commit and push both ledgers. The move is a claim
(`owner_reported_fixed`) until the runner re-verifies it. 🔴 **Prove it where the engine looks.** ⚠️ **Never
move an owner-only finding.** ⚠️ Never edit the generated block. 🔴 **An open HIGH finding stalls the
project's whole pipeline.** Read `references/search-discovery-loop.md` before closing any finding — the exact
markers, the claim states, and what each common class (`canonical-conflicting`, `h1-missing`, …) really means.

## The per-project record

`docs/seo-verification.md` (tokens, which are confirmed, which property type) plus an `SEO Last applied` date
in the project's root `CLAUDE.md`/`AGENTS.md`. Without the date the pass silently never runs again.

## Related skills

`aoneahsan-cccs-react-seo` (the funnel and metadata) · `-seo-content-writing` (what fixes a content verdict) ·
`-postbuild-seo-html` (where the canonical and the crawler body are emitted) · `-sitemap` · `-feed` ·
`-react-aeo` (the answer-engine surface) · `-docusaurus` (a docs site has its own surface record; an authorized Domain property may cover it).
