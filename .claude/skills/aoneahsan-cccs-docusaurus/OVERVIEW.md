# Overview — `aoneahsan-cccs-docusaurus`

## Purpose

Building and maintaining the product documentation sites (`<project>-docs` repos) that ship alongside the
owner's apps and packages. Docs sites serve two audiences: humans, and the coding agents that implement
against them.

## What this skill does

- **Derives the docs domain from the parent project's VERIFIED deployed domain, never from the repo folder
  name** — `<sub>-docs.<base>.<tld>` for a subdomain project, `docs.<apex>` for an apex one, and an **ASK**
  when the project has no marketing site. Carries the five-source discovery ladder and the mandatory `curl`
  probe that settles disagreements between written sources.
- Requires the confirmed domain to be written back to all four places that record it, so it is never
  re-derived: the URL registry, `static/CNAME`, `docusaurus.config.ts`, and the parent project's Links block.
- **Fixes deployment to one path:** public GitHub repo → GitHub Pages, a locally verified build published by hand to `gh-pages` (no Actions, 2026-10-31). No
  Firebase project, no `firebase.json`, no `.firebaserc` — with the canonical workflow, the `gh api` Pages
  calls, and the owner-only DNS steps.
- **Gates secrets out of a public repo:** `.env.example` only, real values in Actions secrets, every provider
  optional, and a `git ls-files` sweep before each commit.
- Requires complete front matter (`title`, `description`, `tags`) on every page and content-type organisation
  with relative links, so `yarn build` under `onBrokenLinks: 'throw'` doubles as the link checker.
- Carries the configuration baseline: `future.v4` + `@docusaurus/faster`, mermaid, the classic preset with
  feeds/sitemap/editUrl, the standard plugin kit (PWA, ideal-image, client-redirects), and the env-to-client
  pipeline (`customFields` + `currentBundler.instance.DefinePlugin` — the Rspack-safe form).
- Covers search (`search-local` for every product site), env-gated analytics (GA4, Clarity, Amplitude/Sentry
  via clientModules), Infima-variable theming, and **machine-readable output for AI agents** — raw
  Markdown/JSON, `/openapi.json`, an AI-integration page, `llms.txt`.
- Sets the build gates including light/dark and 320→1920px checks.
- **Marks `ahsan-notebook` as exempt and not a template** — its auth gate, pagefind + Canary search, and
  Capacitor wrapper apply to it alone.

## When it gets invoked

- Building a new docs site, or adding and reorganising pages in an existing one.
- Choosing, verifying, or changing a docs site's domain.
- Configuring sidebars, search, analytics, redirects or versioning.
- Setting up or repairing GitHub Pages deployment.
- Publishing API documentation intended for AI coding agents to consume.

## Where it applies

Every `<project>-docs` repository. **Not** `ahsan-notebook`, which is a private personal project.

## Sources

`~/.claude/rules/docs-sites.md` (the domain + hosting + secrets law) ·
`_source-understanding/projects/ztools-docs-site.md` (the reference implementation — GH Pages + CNAME,
search-local, env-gated analytics, headTags SEO surface) · `projects/a1notebook-docusaurus.md` (the notebook,
documented as technique only) · `_source-understanding/files/prompt-logs.md` (the raw-markdown/JSON-for-agents
requirement).

## Related skills

`aoneahsan-cccs-documentation` (what to write, and the brevity budget) · `aoneahsan-cccs-react-seo` (the
metadata concerns) · `aoneahsan-cccs-ask-the-owner` (the ASK format when a domain cannot be resolved) ·
`aoneahsan-cccs-react-theming` · `aoneahsan-cccs-copywriting`.

## Maintenance

Re-check on a Docusaurus major upgrade, when the reference site's configuration changes materially, or when
`~/.claude/rules/docs-sites.md` is amended.
