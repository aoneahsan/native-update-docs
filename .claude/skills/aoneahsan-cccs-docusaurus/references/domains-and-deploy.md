# Domains and deployment

The full procedure behind `SKILL.md` §1–§2. Canonical law: `~/.claude/rules/docs-sites.md`.

## Resolving the docs domain

### Step 1 — find the parent project's deployed domain

Walk in order, stop at the first hit:

| # | Source | What to read |
|---|---|---|
| 1 | `code/projects/project-live-urls.json` | the project's `liveUrl` — its own `agentRules.neverAskAgain` names it the source of truth |
| 2 | `code/PROJECT-DEPLOYMENT-STATUS.md` | the **Custom domain** column (~50 projects: Firebase project, `web.app` URL, custom domain) |
| 3 | the project's root `CLAUDE.md` / `AGENTS.md` | "Production URL", "Live", or a Links block |
| 4 | the project's own config | `.env` `VITE_SITE_URL` · `firebase.json` / `.firebaserc` · `capacitor.config.ts` `server.url` · App-Links hosts in `AndroidManifest.xml` |
| 5 | a sibling `<project>-docs/static/CNAME` | only as corroboration — it may itself be the thing that is wrong |

**The folder name is not a source.** It agrees with the subdomain often enough to feel safe and differs often
enough to break things:

| Folder | Actually deployed at | Correct docs domain |
|---|---|---|
| `learnquest-ai` | `learnqai.aoneahsan.com` | `learnqai-docs.aoneahsan.com` |
| `whiteboard-video-maker` | `wbamai.aoneahsan.com` | `wbamai-docs.aoneahsan.com` |
| `interview-preparation-app` | `interviewpai.aoneahsan.com` | `interviewpai-docs.aoneahsan.com` |
| `all-in-one-shopify` | `growthify.aoneahsan.com` | `growthify-docs.aoneahsan.com` |
| `achatai` | `achat.aoneahsan.com` | `achat-docs.aoneahsan.com` |
| `ai-personal-assistant` | `aipa.aoneahsan.com` | `aipa-docs.aoneahsan.com` |
| `empora-for-woocommerce` | `empora.aoneahsan.com` | `empora-docs.aoneahsan.com` |

### Step 2 — prove it with a probe (mandatory)

```bash
curl -s -o /dev/null -w '%{http_code}\n' -m 8 https://<candidate>
```

| Result | Means |
|---|---|
| `200` / `301` | the host is real — confirmed |
| `000` | **does not resolve.** The source that named it is wrong; fix that source in the same task |
| `404` on a *docs* domain | DNS exists, nothing published yet — the normal pre-launch state, not an error |

**Written sources agreeing with each other proves nothing.** `sngdc`'s own `CLAUDE.md`, its `.env`, and
`project-live-urls.json` all recorded `sndgc.aoneahsan.com` — a transposition that resolved nowhere, while
`sngdc.aoneahsan.com` returned 200. A typo propagates into every file that copies it; only the probe
distinguishes a real host from a copied mistake.

### Step 3 — derive, or ask

`<sub>.<base>.<tld>` → `<sub>-docs.<base>.<tld>` · apex `<name>.<tld>` → `docs.<name>.<tld>` · no deployed
site → **ASK**.

Ask when: nothing resolves, two sources disagree and no probe settles it, or the project has no marketing
site (npm packages, internal tools). Format per `aoneahsan-cccs-ask-the-owner` — state every candidate found
with its probe result, and recommend one. Never invent a domain to keep moving.

### Step 4 — write it back to all four places

1. `code/projects/project-live-urls.json` → `docsUrl` (and correct `liveUrl` if the probe disproved it)
2. `<project>-docs/static/CNAME` — one line, no scheme, no trailing slash, trailing newline
3. `<project>-docs/docusaurus.config.ts` → `url`
4. the **parent** project's `CLAUDE.md` + `AGENTS.md` Links block

## Manual Pages deployment (owner decision 2026-10-31)

GitHub Actions are not used for building, testing or deploying. Build and verify the public docs site locally,
then publish only the generated `build/` tree to a dedicated `gh-pages` branch with an ordinary Git push.
🔴 **Remote `o` often fetches only its working branch: fetch with `git fetch o +refs/heads/gh-pages:refs/remotes/o/gh-pages`, stop if `git worktree add` fails, and assert `git -C <worktree> rev-parse --show-toplevel` equals the worktree before `add`, `commit` or `push`.** On 2026-11-07 a failed add left a plain folder inside the workspace repo, and `git -C <folder> add -A` then committed 22,431 files of that repo, temp credentials included. Caught before it reached GitHub. Use `add -A .` and never chain these without `set -e`. 🔴 **`set -e` did not stop the second time (2026-11-07): the same chain pushed a `gh-pages` branch onto the workspace repo.** Chain every step with `&&`, assert both `rev-parse --show-toplevel` and `remote get-url o` before `add`, and expect some docs repos to have no `gh-pages` yet (orphan branch, then switch Pages to it).

Docusaurus 3.10 `docusaurus deploy` is not used: its implementation force-pushes that branch, which the Git
rule forbids. Keep `static/CNAME` and `static/.nojekyll`; Docusaurus copies both into `build/`.

Run the site gates before any publish (`yarn install --immutable`, `yarn typecheck`, `yarn build`, then inspect
the exact built pages at desktop and phone widths). For an existing `gh-pages` branch, fetch it and add a
temporary detached worktree at `origin/gh-pages`. For the first deployment, add an orphan `gh-pages`
worktree instead (`git worktree add --orphan -b gh-pages <workspace>/temp/<repo>-gh-pages`, inside the workspace's one
`temp/` folder, `~/.claude/rules/one-temp-folder.md`). In that worktree, copy `build/`
with `rsync -a --delete --exclude=.git build/ <worktree>/`, check that `CNAME` and `.nojekyll` are present,
commit the generated tree, and use `git -C <worktree> push origin HEAD:gh-pages` **without `--force`**.
A non-fast-forward rejection means another publish advanced the branch: fetch, reconcile in a new worktree,
reverify and push normally. Remove the worktree after the successful push. Do not check generated files into
`main`.

A manual push to `main` remains source control only; it must not publish. After the first `gh-pages` push,
set the Pages API `build_type` to `legacy` and `source` to `gh-pages` at `/` while preserving its verified
custom domain and HTTPS setting. 🔴 **With Actions switched off, the switch alone starts no build** (windowsweep-docs,
2026-10-31: four minutes later the old site still served and `pages/builds/latest` was 404). Two things make it
publish: `static/.nojekyll` must exist (Docusaurus does not create it; GitHub then serves the branch as static
files without its Actions-based Jekyll build), and a build is requested once with
`gh api -X POST repos/aoneahsan/<repo>/pages/builds` (answers `queued`; the new build was live within a minute).
Read the Pages API state back, then compare the live site's rendered pixels
and served asset hash with the exact local build. No GitHub token is needed beyond the operator's normal
existing Git/`gh` login. Build-time provider keys stay optional and local; a docs build must succeed without
secrets.

## Repo configuration

```bash
# After the first ordinary push creates gh-pages, select branch publishing.
gh api -X PUT repos/aoneahsan/<repo>/pages -f build_type=legacy -f 'source[branch]=gh-pages' -f 'source[path]=/'

# read current state
gh api repos/aoneahsan/<repo>/pages --jq '{cname, build_type, https_enforced, status}'

# set the custom domain — ONLY AFTER the DNS record resolves (see below)
gh api -X PUT repos/aoneahsan/<repo>/pages -f cname=<docs-domain> -F https_enforced=false
```

⚠️ **The custom domain cannot be pre-set.** Before DNS resolves, the PUT fails with
`The certificate does not exist yet` — GitHub will not accept a domain it cannot validate. So the order is
fixed: **DNS first (owner), then the Pages custom domain.** Do not treat the failure as a bug.

⚠️ **Never flip the Pages custom domain of a site that is currently serving** until the new DNS record
resolves — the site goes dark in between. Probe the existing domain first; if it returns 200, leave the Pages
setting alone, ship the corrected `static/CNAME`, and hand the switch to the owner as one MANUAL-TASKS step.

**Repo name ≠ folder name.** Resolve it from the git remote (`git remote get-url o | sed 's#.*/##; s#\.git$##'`),
not `basename` — e.g. the folder `sms-app-docs` is the repo `smsapp-docs`, and `gh api` on the folder name
404s misleadingly.

`docusaurus.config.ts` must agree: `url: 'https://<docs-domain>'`, `baseUrl: '/'`,
`organizationName: 'aoneahsan'`, `projectName: '<repo>'`.

## Owner-only steps → `docs/MANUAL-TASKS.md`

1. **Hostinger DNS** — a `CNAME` record for the docs subdomain pointing at `aoneahsan.github.io`.
2. **After a rename** — delete the orphaned record for the old subdomain.
3. **Settings → Pages** — confirm the custom domain and Enforce HTTPS (certificate issuance takes minutes to
   an hour after DNS propagates).

The agent never edits DNS. A `000`/`404` probe after deploying means these steps are still pending — record
it, do not report it as a build failure.

## `docs/MANUAL-TASKS.md` must not publish

`docs/` is both the fixed home of the internal manual-tasks file and the published content directory, so the
file ships as a live public page unless excluded. The same is true of `docs/story/` (the Story Bible,
decision log and drafts — `~/.claude/rules/storytelling-content.md`). Keep the fixed paths and exclude
both — **`exclude` REPLACES the plugin defaults**, so restate them:

```ts
docs: {
  exclude: [
    '**/_*.{js,jsx,ts,tsx,md,mdx}',
    '**/_*/**',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**',
    'MANUAL-TASKS.md',
    'story/**',
  ],
},
```

Verify with `find build -iname '*MANUAL*' -o -path '*/story/*'` after a build — it must return nothing.

## What a docs repo must NOT contain

`firebase.json` · `.firebaserc` · a `firebase:deploy` script · any real `.env` · any keystore, service-account
JSON, `.pem`, or `.npmrc`. Sweep before every commit:

```bash
git ls-files | grep -iE '(^|/)\.env$|\.env\.(local|production)|secret|credential|serviceaccount|\.pem$|\.jks$|\.keystore$|\.p8$|\.npmrc'
```

Must return nothing.

## Domain overrides, packages and where to look (moved verbatim from SKILL.md §1, 2026-11-02)

**The apex form is a default the owner may override.** When the apex zone is not one he manages (e.g.
`legaleaglelaws.com` sits on another registrar), the docs go on the `aoneahsan.com` zone instead —
`legaleaglelaws-docs.aoneahsan.com`. Propose it, don't pick silently.

**An npm package with no docs site gets one** (owner decision 2026-07-25) rather than an ASK — the package
name supplies the label, and the DNS record is an owner-only row in `docs/MANUAL-TASKS.md`, so building the
site is never blocked. A package that *does* have a marketing site derives from that site's real domain as
usual: `nativeupdate.aoneahsan.com` → `nativeupdate-docs.aoneahsan.com`, not from the folder or package name.

**Find the deployed domain** (stop at the first hit): `code/projects/project-live-urls.json` → `liveUrl` ·
`code/PROJECT-DEPLOYMENT-STATUS.md` "Custom domain" · the project's root `CLAUDE.md`/`AGENTS.md` · its
`.env`/`firebase.json`/`capacitor.config.ts` · a sibling `<project>-docs/static/CNAME`.

## The silent ruleset bypass on a direct push (moved verbatim from SKILL.md §2, 2026-11-02)

🔴 **The trap: a direct push can bypass the review ruleset silently.** The Repository-admin bypass applies
with **no flag passed**, so the push succeeds and prints
`remote: Bypassed rule violations for refs/heads/main` (measured on `labflow-docs`, 2026-08-17) instead of
being refused. **Read the push output; quote that line; never call it a clean push.** Never pass `--admin` or
`--force`. Genuinely refused → merge locally and push again; never a PR on his own docs repo (updated 2026-11-02 to match the current docs-sites rule). Law: `~/.claude/rules/docs-sites.md` §8.

## The deploy paragraph (moved verbatim from SKILL.md §2, 2026-11-02)

Public repo → build and verify locally, then manually publish the generated `build/` tree to the `gh-pages`
branch with an ordinary fast-forward Git push. Set GitHub Pages to `legacy` source `gh-pages` at `/`.
**No GitHub Actions build/deploy workflow and no `docusaurus deploy`: Docusaurus 3.10 force-pushes the
deployment branch, which the Git rule forbids.** Keep `.nojekyll` in `static/` and `static/CNAME` on the
verified domain. `baseUrl: '/'`, `organizationName: 'aoneahsan'`, `projectName: '<repo>'` stay in config.
**No `firebase.json`, `.firebaserc`, Firebase deploy script or Firebase project.** The agent deploys docs
manually after the pixel and build gates; DNS and initial custom-domain ownership stay with the owner.

Full wiring: `references/domains-and-deploy.md`.
