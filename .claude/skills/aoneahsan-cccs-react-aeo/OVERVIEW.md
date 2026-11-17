# Overview — `aoneahsan-cccs-react-aeo`

D009 (2026-09-08): apply the evidence contract in `~/.claude/rules-detail/seo-aeo-ranking.md` first.
Historical numeric templates are optional editorial examples, never provider requirements.


## Purpose

Optimising for answer engines and AI assistants, written to keep the claims honest. Its most valuable content
is the distinction between what Google officially states works, what other engines might reward, and what is
simply unevidenced advice repeated across marketing blogs.

## What this skill does

- Leads with **Google's official position**: it ignores `llms.txt` and AI text files, does not require
  structured data, chunking or a special writing style for its generative features, and runs those features
  on core Search ranking. For Google, AEO is SEO.
- Scopes the remaining tactics honestly to **non-Google engines** and **classic SERP features**, and states
  that none of the reviewed sources cited a study — including a flag that our own playbook's Princeton GEO
  percentages need verifying before being repeated.
- Lists useful tactics that also improve the page for humans: direct openings, query-shaped headings where
  useful, clear lists and tables, headings at topic changes, applicable FAQ/HowTo/Article schema, specific
  generated facts over vague claims, and truthful visible authorship and dates.
- Raises **entity consistency** as the underrated factor, tying it to the existing links-and-identifiers
  source of truth and to claiming Bing Places for Copilot.
- Settles the `llms.txt` question: keep generating it, but describe it accurately as speculative non-Google
  surface area.
- Notes that measurement is manual, with explicit sampling and tooling limitations.

## When it gets invoked

- Targeting AI Overviews, ChatGPT, Perplexity or Copilot visibility.
- Structuring content for featured snippets or People Also Ask.
- Someone proposes adding `llms.txt`, `ai.txt` or AI-specific markup.
- Writing or reviewing FAQ, how-to or comparison content.
- Auditing brand and identifier consistency across surfaces.

## Where it applies

Every public-facing web project with content.

## Sources

`_source-understanding/urls/aeo-geo.md` (five sources, one authoritative and four contradicting it) and
`urls/google-seo.md` (the official AI-optimization guide quotes).

## Related skills

`aoneahsan-cccs-react-seo` (the foundation AEO depends on) · `-postbuild-seo-html` (where the content
structure is produced) · `-sitemap` · `-feed`.

## Maintenance

Both former open items are settled (2026-07-20): the owner decided to KEEP `llms.txt` and similar files
(other engines/AI agents are the audience — `urls/google-seo.md`), and the Princeton GEO percentages are now
annotated as study-claimed but independently uncorroborated in `~/.claude/rules/seo-aeo-ranking.md` itself.
