# Deploy runbook — Native Update Docs

This runbook covers the final two steps of the docs-site project that need human intervention: publishing the GitHub repo and deploying to Firebase Hosting. Both are one-time setup tasks followed by a simple repeating workflow.

The site is fully built locally and ready to deploy — `yarn build` produces `build/` and all discovery files (`robots.txt`, `llms.txt`, `llms-full.txt`, `humans.txt`, `.well-known/security.txt`, `sitemap-index.json`, `sitemap.xml`) are emitted correctly. The author of this doc is Ahsan Mahmood (https://aoneahsan.com); replace identifiers if you fork.

## Prerequisites

You need: the GitHub CLI (`gh`) authenticated to your account, the Firebase CLI (`npx -y firebase-tools@latest`) authenticated to a Google account that owns or has Editor access to the target Firebase project, Node 20+, and Yarn 4 via Corepack. Confirm with:

```bash
gh auth status                       # Should show "Logged in to github.com"
npx -y firebase-tools@latest login   # Browser-based login flow
node -v                              # v20+
corepack enable && yarn -v           # 4.x
```

## One-time: publish the GitHub repository

The docs source lives in this repo at `/home/ahsan/Documents/01-code/projects/native-update-docs/`. Today it has no remote. Create the public GitHub repo and push:

```bash
cd /home/ahsan/Documents/01-code/projects/native-update-docs

# Create the public repo on GitHub from the gh CLI. Replace --public with
# --private if you want to delay public visibility while testing the deploy.
gh repo create aoneahsan/native-update-docs \
  --public \
  --source=. \
  --remote=origin \
  --description "Public documentation site for the native-update Capacitor plugin (https://www.npmjs.com/package/native-update). Built with Docusaurus. Maintained by Ahsan Mahmood." \
  --homepage "https://docs.nativeupdate.aoneahsan.com" \
  --push

# Verify
git remote -v
gh repo view aoneahsan/native-update-docs --web
```

After creation:

1. Add topics: `gh repo edit aoneahsan/native-update-docs --add-topic capacitor,ota,native-update,docusaurus,documentation,mobile-updates`
2. Settings → General → Features: enable Issues, disable Wiki (docs site already serves as the wiki).
3. Settings → Pages: leave disabled (we deploy via Firebase, not GitHub Pages).
4. Settings → Branches → main → require pull-request review (optional but recommended once contributors arrive).

## One-time: create the Firebase Hosting project

The `.firebaserc` file in this repo references `native-update-docs` as the Firebase project ID. Create it once:

```bash
# Open Firebase Console → Add project → "Native Update Docs"
# Project ID: native-update-docs (must match .firebaserc default)
# Disable Google Analytics for the project (not needed for static docs).
#
# Or via CLI:
npx -y firebase-tools@latest projects:create native-update-docs --display-name "Native Update Docs"
```

Initialize hosting (one time):

```bash
cd /home/ahsan/Documents/01-code/projects/native-update-docs
npx -y firebase-tools@latest use native-update-docs

# Skip `firebase init hosting` — firebase.json + .firebaserc are already
# committed. The CLI will pick them up automatically.
```

## One-time: connect the custom domain

In Firebase Console → Hosting → Add custom domain:

1. Add `docs.nativeupdate.aoneahsan.com`.
2. Firebase will give you a TXT record for ownership verification and an A / AAAA record for the IP. Add both at your DNS provider (Cloudflare / Namecheap / whichever).
3. Wait ~5-30 minutes for verification + SSL provisioning.

The `docusaurus.config.ts` already has `url: 'https://docs.nativeupdate.aoneahsan.com'`. Once DNS propagates, the site is reachable.

## Recurring: deploy

After any documentation change:

```bash
cd /home/ahsan/Documents/01-code/projects/native-update-docs

# Test the build locally first
yarn build
yarn serve   # Opens http://localhost:5961 — verify everything renders

# Deploy to production
yarn firebase:deploy

# Or: deploy to a 7-day preview channel first (recommended)
yarn firebase:deploy:preview
```

The `firebase:deploy:preview` script returns a temporary preview URL (e.g. `https://native-update-docs--preview-abc123.web.app`) that you can review before promoting to production via the Firebase Console.

## After first deploy: submit to search engines

These steps are manual one-offs. Skip if you're forking and don't want to claim search-engine ownership for `docs.nativeupdate.aoneahsan.com`.

### Google Search Console

1. Open https://search.google.com/search-console.
2. Add property → Domain: `docs.nativeupdate.aoneahsan.com`.
3. Verify ownership via DNS TXT record (same DNS provider as for Firebase).
4. Once verified: Sitemaps → submit `https://docs.nativeupdate.aoneahsan.com/sitemap.xml`.
5. URL Inspection → submit the top 5-10 pages manually to accelerate first indexing: `/`, `/intro`, `/getting-started/installation`, `/getting-started/quick-start`, `/reference/sdk/live-update/overview`.

### Bing Webmaster Tools

1. Open https://www.bing.com/webmasters.
2. Sign in with a Microsoft account.
3. Add site → `https://docs.nativeupdate.aoneahsan.com`.
4. Verify via DNS TXT record or by importing from Google Search Console (faster if you finished GSC first).
5. Sitemaps → submit `https://docs.nativeupdate.aoneahsan.com/sitemap.xml`.
6. Bing feeds DuckDuckGo, Yahoo, and ChatGPT Search — one submission covers all four.

### IndexNow (optional, for rapid re-indexing)

IndexNow is a protocol that lets you push URL updates to Bing / Yandex instantly instead of waiting for re-crawl. The setup is a one-time key file at the site root plus a webhook on every deploy. Not currently wired up — file an issue if you want this added.

## Verify the deploy is healthy

After the first deploy + DNS propagation, sanity-check:

```bash
# Site loads
curl -sSI https://docs.nativeupdate.aoneahsan.com/ | head -3

# robots.txt has the AI-bot allowlist
curl -s https://docs.nativeupdate.aoneahsan.com/robots.txt | grep GPTBot

# sitemap.xml exists and is valid XML
curl -s https://docs.nativeupdate.aoneahsan.com/sitemap.xml | head -5

# llms.txt and llms-full.txt
curl -sI https://docs.nativeupdate.aoneahsan.com/llms.txt | head -3
curl -sI https://docs.nativeupdate.aoneahsan.com/llms-full.txt | head -3

# Security.txt
curl -s https://docs.nativeupdate.aoneahsan.com/.well-known/security.txt | head -5

# JSON-LD on the homepage
curl -s https://docs.nativeupdate.aoneahsan.com/ | grep -o 'application/ld+json'
```

Each should return a 200 plus the expected content. Plug the homepage into [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/) to confirm the JSON-LD parses correctly.

## Recurring: keep the docs fresh

The project's master tracker is at `/home/ahsan/Documents/01-code/projects/native-update/docs/docs-site/tracker.json`. After this final batch closes (status: complete, 7-day cooldown), the tracker becomes the authoritative resume point for future updates.

When the plugin ships new versions or feature changes, the docs need refreshing — that's a separate review-and-update cycle, not part of the initial Batch 1-10 flow. The cooldown gates accidental re-runs of the entire batch flow.

## Troubleshooting

**`yarn build` fails with a broken-link error.** Docusaurus is strict by default. Either fix the link or relax `onBrokenLinks: 'throw'` to `'warn'` in `docusaurus.config.ts` — but only as a temporary measure; broken links should be fixed.

**`firebase deploy` fails with "Permission denied".** Your Google account doesn't have Editor/Owner role on the Firebase project. Either grant it via Firebase Console → Project Settings → Users, or `firebase login --reauth` with the correct account.

**Custom domain stuck at "Needs setup".** DNS records haven't propagated yet. Check with `dig docs.nativeupdate.aoneahsan.com` — the answer should match the IP Firebase showed you. Allow up to 24 hours for global DNS propagation.

**Site loads but search engines aren't indexing.** Submit the sitemap manually in GSC + Bing (above). Indexing typically takes 1-7 days for a new domain. Use GSC's "Inspect URL" tool to nudge the top pages.

**Mermaid diagrams don't render after deploy.** Check that `@docusaurus/theme-mermaid` is in `dependencies` (not `devDependencies`) and that `themes: ['@docusaurus/theme-mermaid']` is in `docusaurus.config.ts`. Both are set; re-build if you see this in production.

## Authored by

[Ahsan Mahmood](https://aoneahsan.com) — author of `native-update` and maintainer of this documentation site.
