# Contributing to native-update-docs

Thanks for helping improve the documentation for [native-update](https://www.npmjs.com/package/native-update). The live site is **https://nativeupdate-docs.aoneahsan.com** — every merge to `main` deploys it automatically via GitHub Actions.

## Governance

- `main` is protected by a repository ruleset: changes land through a **pull request with at least 1 approving review and a green `build` check**.
- Only the repository owner (**@aoneahsan**, repository admin) can push to `main` directly; write-access collaborators still go through review.
- Force-pushes to and deletion of `main` are blocked for everyone.

## How to contribute

**Anyone (no access needed):** fork the repo, branch, commit, open a pull request against `main`. The `build` check (typecheck + Docusaurus build with `onBrokenLinks: 'throw'`) must pass and one approval is required.

**Want collaborator (write) access?** Open an issue using the **"Contributor access request"** template (or email aoneahsan@gmail.com) describing what you plan to work on. Access is granted at the owner's discretion — and still cannot bypass review on `main`.

## Dev setup

```bash
yarn                     # Yarn 4.x (yarn.lock is Berry format)
yarn start               # dev server on port 5960
yarn typecheck && yarn build   # the same gate CI runs
```

Notes:
- Do **not** add a `packageManager` field to `package.json` (deliberately absent).
- Content facts must match the real plugin API in `native-update`'s `src/definitions.ts`. No fabricated examples.
- `plugin-version.json`, `docs/ai-integration.md`, and `docs/changelog.md` are **generated** by `yarn sync:from-plugin` (maintainer-only — it reads the private plugin repo). Don't edit them by hand.

## Commit style

Conventional Commits (`docs: …`, `feat: …`, `fix: …`, `chore: …`).

## Support

If this project helps you, you can support the author at **https://aoneahsan.com/payment**.
