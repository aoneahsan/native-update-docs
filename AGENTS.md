# Native Update Docs — AGENTS.md

Public Docusaurus documentation for the `native-update` Capacitor plugin. This is a separate public Git repository on `main`; the private product repository is at `../native-update/`.

## Context and ownership

- Last fleet context review: 2026-10-14. Next routine review: 2026-11-13. The workspace tracker is authoritative; a material tree change or a proven stale instruction may trigger an earlier review.
- Read `../native-update/docs/docs-site/tracker.json` for the completed ten-batch authoring flow. That seven-day batch cooldown is separate from this fleet context review.
- Verify API descriptions against the sibling product's source. Never invent a capability, method, version, or statistic.
- This repository uses Yarn 4.17.1, Node >=18, and `yarn.lock`. `package.json` pins the package manager.

## Release and deploy

- The product `package.json` is the version source. After a plugin release, run `yarn sync:from-plugin` here and commit its generated version and page changes. Current checked-in `plugin-version.json` is 4.1.0.
- Run `yarn typecheck` and `yarn build`. Preview the built site with `yarn serve` before pushing visible changes.
- A push to `main` runs `.github/workflows/deploy-pages.yml` and deploys GitHub Pages. The custom domain is carried by `static/CNAME`; see `DEPLOY.md`. Confirm the Actions run before calling the deploy complete.
- Do not put secrets in this public repository.

**Last updated:** 2026-10-14.
