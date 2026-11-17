# AEO patterns

## Direct opening when a definition helps

```md
## What is a CSV formatter?

A CSV formatter is a tool that reads comma-separated values and re-writes them with consistent
delimiters, quoting and line endings. It fixes files that fail to import because a field contains a
comma, a stray quote, or Windows line endings.
```

The first sentence gives a reader enough context to understand the tool. Use this pattern when the audience
needs a definition; other page purposes may need a result, instruction or constraint first.

## Answer-first sections at snippet length

```md
### Does this work offline?

Yes. The formatter runs entirely in your browser — the file never leaves your device, and the tool
keeps working with no network connection after the page has loaded.

[…then the supporting detail…]
```

The direct answer is complete on its own; elaboration follows. This improves reading and reuse without
promising that a search or answer system will select it.

## FAQPage schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Does this work offline?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes. The formatter runs entirely in your browser — the file never leaves your device."
    }
  }]
}
```

The schema text should **match the visible answer**. Schema that describes content not on the page is a
structured-data violation, not a shortcut.

## HowTo schema

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to format a CSV file",
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Paste your data",
      "text": "Paste the CSV into the input area, or drop a .csv file onto it." }
  ]
}
```

Only where the content genuinely is a procedure with ordered steps.

## Article schema for visible article metadata

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "…",
  "author": { "@type": "Person", "name": "Ahsan Mahmood", "url": "https://aoneahsan.com" },
  "datePublished": "2026-01-15",
  "dateModified": "2026-07-20",
  "image": "https://…/og/png/article.png"
}
```

`dateModified` should be genuine. Bumping it without changing anything is the kind of signal-gaming that stops
working and damages trust when noticed.

## Specific facts, generated

```ts
// Build-time substitution — the claim cannot go stale.
`${SITE_NAME} includes ${toolCount} tools across ${categoryCount} categories.`
```

This is the AEO tactic our own build already implements: ztools replaces `__TOOL_COUNT__` at build time
precisely so the homepage never states a number that has drifted. See `aoneahsan-cccs-postbuild-seo-html`.

## Content structure for a programmatic page

Historical optional ZTools editorial template, not a search eligibility threshold:

| Section | Length | Serves |
|---|---|---|
| Direct introduction | Answer the page purpose | Reader orientation |
| Use cases | Include the relevant cases | Task recognition |
| How it works | Include the steps the task needs | Procedure clarity |
| Worked examples | Make the behavior concrete | Verification |
| FAQ | Include real recurring questions | Direct answers |
| Tips | Include useful constraints or shortcuts | Practical guidance |
| Author and updated date | Include when displayed and truthful | Provenance |

This optional ZTools shape has no universal word or section-count requirement. Keep only the fields the
page needs, and write enough original content to complete its purpose without padding.

## What not to do

- **Do not keyword-stuff.** It harms clarity; record any search or citation effect from measured evidence.
- **Do not fabricate statistics.** Cite a named source or omit the number.
- **Do not claim `llms.txt` helps Google.** It requires no such file for its AI features.
- **Do not add schema that misdescribes the page** to qualify for a rich result.
