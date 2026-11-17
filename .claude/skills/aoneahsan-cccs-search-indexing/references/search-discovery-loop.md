# The search-discovery loop in full

How a finding moves from the issues file to the fixed ledger, its claim states, the owner-only and generated-block rules, and what each common class means.

**The loop:** fix → **deploy** → prove it on the **LIVE** surface → move the entry verbatim into the fixed
file, wrapped in its exact `search-discovery:fixed` issue markers with the full 40-character fix commit,
RFC3339 deployment time and live evidence → **delete its text from the issues file** → commit and push both
ledgers → when the queue is empty, carry on with the project's own remaining work.

That move is a project claim awaiting independent runner verification. It enters
`owner_reported_fixed`; it becomes `verified_fixed` only after the runner reruns the recorded live acceptance
check. Failed or inconclusive verification reopens it. Never create the claim from inferred deployment data.

🔴 **Prove it where the engine looks.** Fetch the live URL; source and build output do not prove the deployed
surface a crawler sees.

⚠️ **Never move an owner-only finding.** A sitemap submission, a property verification, a DNS record — the
agent side being done is not the finding being closed. Leave it in the issues file, say it is his, and add
the `docs/MANUAL-TASKS.md` row.

⚠️ **The generated block warns that edits are replaced on the next run.** The runner accepts only exact issue
removals paired with valid fixed-ledger claims, checks all remaining issue bytes and refreshes the generated
hash during import. Never edit that block to reword a finding.

🔴 **An open HIGH finding stalls the project's whole pipeline** — the runner does not process a project again
until its high-severity findings verify fixed.
All severities must clear before the project is complete; high/critical severity controls the earlier
ordinary-processing hold.

### What the common classes actually mean

| Class                     | The real defect, and where to look                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canonical-conflicting`   | **two** `rel=canonical` naming different URLs, so the engine discards both and picks for itself. Usually a theme's per-page tag PLUS a site-wide one in config. Count on the BUILT page, then the live one |
| `canonical-duplicate-tag` | the same canonical twice — harmless to a reader, still ambiguous to a parser                                                                                                                               |
| `h1-missing`              | a page with no level-one heading. On a themed site this is often the theme's own template, not your content — fixing it may mean a swizzle, which is itself how a second canonical emitter gets introduced |
| `sitemap-not-submitted`   | 🔴 **owner-only.** The file can exist and be perfect; submission is a console action                                                                                                                       |
