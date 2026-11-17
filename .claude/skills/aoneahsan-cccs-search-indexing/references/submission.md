# Submission, IndexNow, the cadence, and a domain move

## Once per project

1. **GSC — a domain property.** Add `example.com` (not `https://example.com/`), verify with the DNS TXT record.
   Write the record to `docs/seo-verification.md` for the owner; DNS is his to change.
2. **Submit the sitemap** — the absolute URL, once. GSC re-reads it on its own schedule afterwards.
3. **Bing Webmaster Tools** — either import from GSC or verify separately, then submit the sitemap and
   **generate the IndexNow key**. Read the current verified-site quota from the official API.
4. **Yandex Webmaster** — add and verify only after the project gate permits it; check current IndexNow support before claiming receipt.
5. **`robots.txt` carries an absolute `Sitemap:` line.** Relative does not count.
6. Record everything in `docs/seo-verification.md`: which properties exist, which are **confirmed**, the
   property type, and the date.

## IndexNow, wired to the deploy

One POST per changed URL set, after a successful deploy:

```bash
curl -s -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json' \
  -d '{"host":"example.com","key":"<indexnow-key>","urlList":["https://example.com/a","https://example.com/b"]}'
```

- **Changed or deleted URLs only.** A full unchanged submission is not evidence of a content change.
- The key file must be reachable at `https://example.com/<key>.txt` containing the key — a public build
  artefact, not a secret.
- Google is **not** a consumer. Do not describe an IndexNow integration as "submitting to Google".

## The monitoring pass

| Check | What a bad answer looks like |
|---|---|
| Indexed page count | a material change that needs like-for-like comparison and diagnosis |
| Pages report reason breakdown | a new reason appearing, or one growing |
| Top queries | queries for pages that no longer exist |
| `sitemap.xml` freshness | a `lastmod` that differs from meaningful content-change evidence |

A falling count starts an investigation. Check reporting scope and lag, then recent canonical, robots,
route, `noindex`, deployment and rendering changes. Record the observed cause only when evidence supports it.

## A domain move, in order

Doing these out of order loses the accumulated authority, and it does not come back quickly.

1. New property in GSC **before** anything moves.
2. **301** every old URL to its new counterpart — one hop, never a chain, never a redirect to the home page.
3. GSC → **Change of Address** on the old property.
4. Update every absolute URL we control: sitemap, feed, canonical tags, JSON-LD, `llms.txt`, store listings,
   the docs site, `PROJECT-LINKS-IDENTIFIERS-CONTACT.json`.
5. Keep the old domain resolving and redirecting for **at least a year**.
6. Watch both properties on the recorded migration cadence and retain the old property evidence.

## A docs site has its own surface record

`<project>-docs.<base>.<tld>` is a separate host with its own sitemap and record. An authorized parent Domain property can cover it;
a separate URL-prefix property is optional. See (`~/.claude/rules/docs-sites.md`, and `aoneahsan-cccs-docusaurus` for the
site itself). 🔴 And it must not ship
`docs/MANUAL-TASKS.md` — a public docs build that includes the owner's private runbook is a disclosure, not an
indexing problem, but the indexing pass is where it usually gets noticed.

## Reporting

Say **which** of these happened, with numbers: submitted · crawled · indexed. "Submitted to Google" reported as
"indexed" is the most common dishonest SEO sentence there is, and the console shows the difference plainly.
