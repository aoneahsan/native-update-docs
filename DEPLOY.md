# Deploying native-update-docs

**Deploys are automatic.** Every push to `main` runs `.github/workflows/deploy-docs.yml`, which builds the site (typecheck + `docusaurus build` with `onBrokenLinks: 'throw'`) and publishes it to **GitHub Pages** at:

> **https://nativeupdate-docs.aoneahsan.com**

There is no manual deploy step and no Firebase involvement (the old Firebase Hosting setup was removed 2026-07-14 — it was never actually deployed).

## The normal flow

```bash
cd /Users/pc/Documents/ahsan-work/code/production-projects/native-update-docs
yarn sync:from-plugin        # after any plugin release: refresh plugin-version.json,
                             # docs/ai-integration.md, docs/changelog.md, llms-full version
yarn typecheck && yarn build # same gate CI runs; onBrokenLinks throws on dead links
git add -A && git commit -m "docs: <what changed>"
git pull --rebase o main && git push o main   # remote is named "o"
gh run watch --repo aoneahsan/native-update-docs --exit-status   # build + deploy green
```

The site is live ~2 minutes after the run finishes.

## Manual fallback

Re-run the workflow without a new commit:

```bash
gh workflow run deploy-docs.yml --repo aoneahsan/native-update-docs
```

## GitHub Pages configuration (already done — reference only)

- Pages build type: `workflow` (GitHub Actions source), enabled via `gh api -X POST repos/aoneahsan/native-update-docs/pages -f build_type=workflow`.
- Custom domain: `nativeupdate-docs.aoneahsan.com`, set via `gh api -X PUT repos/aoneahsan/native-update-docs/pages -f cname=nativeupdate-docs.aoneahsan.com -f build_type=workflow`. No `static/CNAME` file — Actions-source Pages ignores it.
- DNS (Hostinger, aoneahsan.com zone): `CNAME nativeupdate-docs → aoneahsan.github.io` (TTL 300).
- HTTPS enforced once the Let's Encrypt cert issued: `gh api -X PUT repos/aoneahsan/native-update-docs/pages -f cname=nativeupdate-docs.aoneahsan.com -F https_enforced=true`.
- Inspect state anytime: `gh api repos/aoneahsan/native-update-docs/pages --jq '{status, cname, https_enforced, cert: .https_certificate.state}'`.

## Prerequisites (local)

- Node ≥ 18 (Node 24 recommended — matches CI) and Yarn 4.x (`yarn.lock` is Berry format; the repo deliberately has NO `packageManager` field — do not add one).
- `gh` CLI authed as the owner for the Pages API commands above.

## Gotchas

- `onBrokenLinks: 'throw'` — one dead internal link fails the build (this is the link checker; fix the link, don't downgrade the setting).
- `plugin-version.json` + the two synced pages come from the PRIVATE sibling plugin repo via `yarn sync:from-plugin`. CI cannot regenerate them — always run the sync locally and commit the result.
- `main` is protected by a ruleset (PR + 1 approval + `build` check); the owner's direct pushes bypass it by design.
