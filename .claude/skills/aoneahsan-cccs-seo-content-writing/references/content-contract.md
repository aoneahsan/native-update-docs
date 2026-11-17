# The per-page content contract, its gates, and its fallback

Numerical section sizes below are optional historical editorial examples, not Google requirements.

## The record

```ts
/** One page's content. Every SEO surface reads THIS — never a copy. */
export interface PageContent {
  readonly slug: string;              // matches the route, so the join is not by title
  readonly distinctTitle: string;      // accurate, concise and unique
  readonly distinctDescription: string;// accurate description; HTML-escape punctuation
  readonly intro: string;              // answer the page purpose directly
  readonly useCases?: readonly string[];     // relevant cases only
  readonly howItWorks?: readonly Step[];     // steps the procedure needs
  readonly examples?: readonly Example[];    // concrete and checkable
  readonly faq?: readonly QA[];              // real questions with factual answers
  readonly tips?: readonly string[];         // useful constraints or shortcuts
  readonly keywords?: readonly string[];     // drives the /sitemap page's fuzzy search
  readonly lastUpdated?: string;             // ISO date — REAL, never bumped alone
  readonly author?: string;                  // Article schema
}
```

🔴 **`slug` joins the record to the route, not the title.** A title changes for editorial reasons; a slug is a
frozen public URL. Joining by title is how enrichment silently detaches from the page it describes.

## Where the headings live

For a hand-written page with sections — a landing page, an about page — the **section headings are part of the
record**, not string literals in the components:

```ts
export const CHAPTERS = [
  {id: 'ch-002', label: 'Method',   heading: 'A habit is a loop, not willpower',
   summary: 'Cue, routine, reward — the three parts you can actually change.'},
  // …
] as const;
```

The section components map over it, and the build's crawler-body function maps over the same array. Adding a
tenth section then updates the human page **and** the crawler body in one edit, which is the entire point.

## The gates — run per page, in the build

| Gate | Threshold | Why |
|---|---|---|
| metadata | accurate, descriptive, correctly escaped | help readers identify the page; no fixed Google character limit |
| content | fulfills the page purpose without padding | no word/FAQ-count indexing threshold |
| structured data | applicable to visible content | no guaranteed search feature |
| headings | exactly one `h1`, no skipped levels | accessibility and parsing both |
| internal links | relevant crawlable links for intended discovery | discovery and crawl budget |
| **crawler body** | contains every section heading in the record | 🔴 the ISSUE-003 gate |

**A failing gate warns, it does not break the build** — except the crawler-body gate, which is the one whose
failure is invisible everywhere else.

## Fallback, so incomplete enrichment is safe

```ts
const content = CONTENT_BY_SLUG[slug];
if (!content) {
  logger.warn(`[seo] no content record for ${slug} — falling back to registry metadata`);
  return templatedFrom(registryEntry(slug));   // label + blurb, honest and thin
}
```

Enrichment is **additive**. Large page sets may need several passes — ztools reached 573
enriched entries across 45 batches — so a missing record must produce a thinner page and a warning, never a
crash and never a blank.

## The drift assertion

```ts
// Pre-approved required-minimum test (rules/dev-workflow.md): parity between the
// rendered sections and the crawler body, both derived from CHAPTERS.
it('the crawler body carries every section heading', () => {
  const body = buildNoscript('/');
  for (const chapter of CHAPTERS) expect(body).toContain(chapter.heading);
});
```

🔴 **Watch it fail once.** Delete one chapter's heading from the generated body, confirm *that* assertion goes
red, restore, and record the message. An assertion nobody has seen fail is indistinguishable from one asserting
nothing (`aoneahsan-cccs-unit-testing`).
