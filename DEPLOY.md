# Deploying native-update-docs

**Deploys are manual (no GitHub Actions in the owner's repos, 2026-10-31).** The local build is published to the
`gh-pages` branch, which GitHub Pages serves (legacy build type, branch `gh-pages`, path `/`) at:

> **https://nativeupdate-docs.aoneahsan.com**

## The normal flow

```bash
cd /home/ahsan/Documents/01-code/production-projects/nativeupdate-root/native-update-docs
yarn sync:from-plugin        # after any plugin release: refresh plugin-version.json,
                             # docs/ai-integration.md, docs/changelog.md, llms-full version
yarn typecheck && yarn build # onBrokenLinks throws on dead links
git add <paths> && git commit -m "docs: <what changed>" && git fetch o && git merge o/main && git push o main
# publish build/ to gh-pages from a worktree in the workspace temp folder
T=/home/ahsan/Documents/01-code/temp/native-update-docs
git worktree add --detach "$T" o/gh-pages
(cd "$T" && git rm -rq --cached . && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + \
  && cp -a "$OLDPWD/build/." . && git add -A && git commit -m "Publish native-update-docs <main hash>" \
  && git push o HEAD:gh-pages)
git worktree remove "$T" && git worktree prune
```

The site serves the new build within a minute; confirm with
`curl -s https://nativeupdate-docs.aoneahsan.com/raw/changelog.md | head`. `build/` already carries `CNAME` and
`.nojekyll` from `static/`.

## GitHub Pages configuration (already done — reference only)

- Pages build type: `legacy`, source branch `gh-pages`, path `/` (checked 2026-11-19 with `gh api repos/aoneahsan/native-update-docs/pages`).
- Custom domain: `nativeupdate-docs.aoneahsan.com`, carried by the tracked `static/CNAME` file and configured in GitHub Pages.
- DNS (Hostinger, aoneahsan.com zone): `CNAME nativeupdate-docs → aoneahsan.github.io` (TTL 300).
- HTTPS enforced once the Let's Encrypt cert issued: `gh api -X PUT repos/aoneahsan/native-update-docs/pages -f cname=nativeupdate-docs.aoneahsan.com -F https_enforced=true`.
- Inspect state anytime: `gh api repos/aoneahsan/native-update-docs/pages --jq '{status, cname, https_enforced, cert: .https_certificate.state}'`.

## Prerequisites (local)

- Node ≥ 18 and Yarn 4.17.1, pinned in `package.json`; CI currently uses Node 20.
- `gh` CLI authed as the owner for the Pages API commands above.

## Gotchas

- `onBrokenLinks: 'throw'` — one dead internal link fails the build (this is the link checker; fix the link, don't downgrade the setting).
- `plugin-version.json` + the two synced pages come from the PRIVATE sibling plugin repo via `yarn sync:from-plugin`. CI cannot regenerate them — always run the sync locally and commit the result.
- `main` is protected by a ruleset (PR + 1 approval + `build` check); the owner's direct pushes bypass it by design.
