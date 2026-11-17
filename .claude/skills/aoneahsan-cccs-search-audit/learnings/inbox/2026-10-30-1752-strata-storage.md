# Learning inbox — strata-storage, run 2026-10-30-1752

## 1. A probe that lied — canon-sweep's description/robots greps required quoted attributes (FIXED IN PLACE)
- Docusaurus 3.10 with `@docusaurus/faster` minifies HTML: `<meta data-rh=true name=description content="…"/>`,
  `<link data-rh=true rel=canonical href=https://…/>`. The `d=` and `r=` greps in `references/probes.md` canon-sweep
  matched only `name="description"`, so every page of a minified docs site would read as "no description" (false FAIL).
- Fixed in `probes.md` (quotes optional), calibrated: quoted good 1 · unquoted good 1 · absent 0 · empty content 0.
- My own ad-hoc canonical grep (`rel="canonical"`) hit the same trap on the built output (0 of 90) before I widened it.

## 2. Stack recipe — Docusaurus generated category indexes break the reference `withLastmod`
- A `generated-index` category lives at `/category/<label-slug>` while its pages live under `/<folder>/…`, so
  "newest page under its own path" finds nothing and the reference plugin throws (`… has no lastmod`).
- Recipe: an explicit `categoryRoots` map (`'/category/guides': '/guides'`) passed to `withLastmod`, keeping the indexed
  URLs (no redirects). strata-storage-docs `plugins/site-pages.ts`, `docusaurus.config.ts` `CATEGORY_ROOTS`.

## 3. Bundle-hash proof on GitHub Pages
- Pages builds in CI, so the live `main.<hash>.js` differs from a local build even on the same commit and Node
  version: Docusaurus `createData` module ids embed the build machine's absolute path
  (`/home/runner/work/…/site-pages.json` vs a local path). Prove the deploy with the Pages run's commit = HEAD plus
  a diff of the two bundles that shows only that path, not with hash equality.

## 4. IndexNow on a docs site
- Needs a key file in `static/<key>.txt` (public artefact). First submission for strata-storage-docs: 91 URLs → 202.
