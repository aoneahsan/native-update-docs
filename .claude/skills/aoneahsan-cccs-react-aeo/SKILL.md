---
name: aoneahsan-cccs-react-aeo
description: 'Optimising for answer engines and AI assistants: what Google officially says does and does not work, the content structure earning snippet and citation eligibility, entity consistency, and honest framing of which tactics are evidence-backed. Use when targeting AI Overviews, ChatGPT or Perplexity, or when asked to add llms.txt.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/urls/aeo-geo.md
---

# AEO / GEO

🔴 Read `~/.claude/rules-detail/seo-aeo-ranking.md` → "Evidence contract" first. It supersedes
older numerical examples and unsupported provider claims in this skill and its references.


## 🔴 Start with what Google actually says

Google's current AI-features guidance requires ordinary search eligibility: an indexed page eligible
for a snippet. No extra technical requirement, special schema or AI text file is needed. Eligibility
does not guarantee inclusion. See the official sources in the evidence contract.

### So what is the rest of this skill for?

Two things Google's statement does not cover: **other engines** (ChatGPT, Perplexity, Copilot — whose current official crawler guidance must be checked separately), and **classic SERP features** (featured snippets, People Also Ask, voice) whose eligibility and presentation rules must be checked separately.

**Be honest about the evidence.** Of the sources reviewed, none cited a study. Our own playbook quotes
Princeton GEO (KDD 2024) uplift percentages — that citation should be verified against the paper before any
skill repeats the numbers. Treat the tactics below as cheap, low-risk and plausible — not as mechanisms.

## The tactics worth doing anyway

They cost little and improve the page for humans too:

- **Answer directly.** When a heading asks a question, answer it before supporting detail. A definition is
  useful when the reader needs one; it is not a required opening template.
- **Headings mirror real queries**, some phrased as questions.
- **Lists and tables** — use them when they make an answer easier to read or compare; extraction is not promised.
- **Subheadings at topic changes** so the structure follows the content.
- **`FAQPage`, `HowTo` and `Article` schema** where the content genuinely is a FAQ, a procedure or an article.
- **Specific facts over vague claims** — "484 tools across 17 categories" beats "many tools", and a
  build-derived number stays consistent with that build.
- **Author, credentials and a visible `lastUpdated`.**

## Entity consistency is the underrated one

Consistent names, domains, contacts and identifiers help systems and readers distinguish the same entity. Inconsistent
across your site, stores, profiles and directories make you look unreliable. Our
`PROJECT-LINKS-IDENTIFIERS-CONTACT.json` is the source of truth — treat drift from it as an identity-consistency defect; an AI visibility effect is unproven,
not just untidiness.

**Claim Bing Places** — it is the Copilot-facing surface.

## llms.txt: keep, but do not oversell

🔴 Two rules from the 2026-10-26 GSC audit:
- it must be a real text file (a 200 that returns the app's HTML is SA-P04);
- its product facts must equal the app, docs, JSON-LD and store listing (AI-05).

The current proposal is llms.txt **v2** (llmstxt.org, 2026-08-10): an H1 name, an optional summary
blockquote, H2 sections of links, and an `Optional` section. The checks are in `/search-audit`
(`aoneahsan-cccs-search-audit`).

Google does not require it for AI features. Other consumers may use it. Generating it costs nothing — ztools does — so keep it, and state
plainly in any project doc that it is **speculative, non-Google surface area**.

## Measurement is manual

Tools and capabilities change; record the exact measurement method and limitations. Test target prompts in ChatGPT, Perplexity and AI Overviews monthly; record
brand-mention rate and AI-referral traffic separately from rankings.

For content templates and schema examples, read `references/patterns.md`.

## Related skills

`aoneahsan-cccs-seo-content-writing` (the answer-first content contract these tactics describe, and the
`<noscript>` body an AI crawler actually reads) · `-react-seo` (the indexing funnel — an unindexed page is
ineligible for every one of these) · `-search-indexing` (properties and monitoring) ·
`-postbuild-seo-html` (the generator) · `-sitemap` · `-feed`.
