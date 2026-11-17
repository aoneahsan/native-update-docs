# Search Console diagnosis

Read the Pages report and URL Inspection alongside Performance. Capture property, URL, observation date,
last crawl, indexed verdict, selected canonical and the precise provider reason. Recovery times are unknown.

| State | Meaning and next check |
|---|---|
| Crawled – currently not indexed | Crawled but not indexed. Inspect indexed/live versions, rendering, directives, canonical selection and content purpose; no word-count diagnosis. |
| Discovered – currently not indexed | Known but not yet crawled in this report. Check discovery links, availability, crawl evidence and reporting delay. |
| Alternate page with proper canonical | Compare intended, declared and selected canonical. An intentional alternate can be correct. |
| Duplicate without user-selected canonical | Inspect the duplicate set and choose the intended preferred URL consistently. |
| Soft 404 | Google treated it as an error-like page. Inspect rendered content/status before deciding on content, redirect or true 404. |
| Blocked by robots.txt | Check the applicable crawler group. A block is not a noindex directive or access control. |
| Excluded by noindex | Verify page intent; permit crawling if the engine needs to read that directive. |
| Redirect error / crawl anomaly | Inspect the complete redirect/status chain, network and rendering evidence. |
| Not found (404) | Verify whether removed or broken. Preserve the frozen-public-URL contract with a relevant replacement redirect where one exists. |

Fetch headers and body, then use URL Inspection's live test/rendered view when available. A local static
shell is a heuristic; missing browser evidence remains unknown. Correct confirmed defects, verify the
deployment, then observe provider recovery separately. Repeated sitemap submission cannot force indexing.
Never equate submitted, crawled and indexed counts. Do not add noindex just to conceal an unresolved finding.

## The Sitemaps report

| Status | Meaning and next check |
|---|---|
| Success | Read and parsed. The discovered count should match the routes listed; a gap means private routes filtered too hard or a stale build |
| Has errors | Read with item errors. Expand each, then fix the generator; never hand-edit the file |
| Couldn't fetch / "Sitemap could not be read" | Not fetched. Run `aoneahsan-cccs-sitemap` → [its fetch checklist](../../aoneahsan-cccs-sitemap/references/couldnt-fetch.md). Its ordered checks find a defect of ours; if they all pass it is low crawl demand or Google's host load (Mueller, 2026-10-01), common on a new host. The owner's URL Inspection live test proves the fetch. Resubmitting the same URL, renaming the file or the retired ping endpoint changes nothing |

Type "Unknown", 0 discovered pages and an empty "Last read" together mean Google has not fetched the file
yet. They are not a parse error.
