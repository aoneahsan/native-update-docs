---
name: aoneahsan-cccs-docusaurus
description: 'Docusaurus docs sites: deriving the domain from the parent project''s real deployed domain, manual GitHub Pages deployment, content structure and front matter, sidebars, local search, env-gated analytics, Infima theming, machine-readable output for AI agents. Use when creating, editing or deploying a docs site.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/projects/ztools-docs-site.md + projects/a1notebook-docusaurus.md + rules/docs-sites.md
---

# Docusaurus

> 🔴 **Hosting (owner, 2026-11-05):** docs sites stay on GitHub Pages. Never move one to Cloudflare or Firebase, and never ask.

Every product docs site is the same shape: **a public GitHub repo → GitHub Pages, on a domain derived from
the parent project's real deployed domain.** Docusaurus 3 + `@docusaurus/faster` + `future: { v4: true }`,
TypeScript ~6 (the fleet pin), yarn.

## 1. The domain — derive it, never guess it

**Derive from the project's VERIFIED deployed domain. Never from the repo folder name.**

| Project's main site | Docs domain | Example |
|---|---|---|
| subdomain `<sub>.<base>.<tld>` | `<sub>-docs.<base>.<tld>` — `-docs` on the **first label only** | `wbamai.aoneahsan.com` → `wbamai-docs.aoneahsan.com` |
| apex `<name>.<tld>` | `docs.<name>.<tld>` | `trizlink.com` → `docs.trizlink.com` |
| **npm package** with no site | `<npm-package-name>-docs.aoneahsan.com` | `strata-storage` → `strata-storage-docs.aoneahsan.com` |
| anything else with no site | **ASK THE OWNER** — never invent one | — |

❌ Never `docs.<sub>.<base>.<tld>` for a subdomain project. ❌ Never a label from the folder name —
`learnquest-ai/` deploys to `learnqai.aoneahsan.com`, so its docs are `learnqai-docs.aoneahsan.com`.

**The apex form is a default the owner may override** (an apex zone he does not manage goes on `aoneahsan.com`
— propose it, don't pick silently). A package *with* a marketing site derives from that site. **Find the
deployed domain** in `project-live-urls.json` first; the full source order and the override cases:
`references/domains-and-deploy.md` → "Domain overrides" — read it when the table above does not settle it.

**Then PROVE it — this step is not optional:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -m 8 https://<candidate>
```

`200`/`301` confirms. **`000` means the host does not resolve and the source naming it is wrong** — fix that
source too. **Sources disagreeing, or nothing resolving, is an ASK, not a guess.**

Record the confirmed domain in all four places: `project-live-urls.json` `docsUrl`, `static/CNAME`,
`docusaurus.config.ts` `url`, and the parent project's Links block.

## 2. Deploy — manually to GitHub Pages, never Firebase

Build and verify locally, then publish `build/` to `gh-pages` with an ordinary fast-forward push. 🔴 **No GitHub
Actions workflow, no `docusaurus deploy`** (it force-pushes), **no Firebase file, script or project.** Keep
`.nojekyll` and `static/CNAME`; DNS stays with the owner. Read `references/domains-and-deploy.md` before the
first deploy.

### 🔴 Commit and push a docs site DIRECTLY — never ask (owner directive 2026-08-17)

An ordinary own project's docs site is committed and pushed **without asking**, even though the repo is
public. **Only a project the owner has MARKED PRIVATE or CLIENT** (`ahsan-notebook`, PERKFORCE) still requires
asking — the test is his marking, not repo visibility.

🔴 **The trap: a direct push can bypass the review ruleset silently** and print `remote: Bypassed rule
violations for refs/heads/main`. **Read the push output; quote that line; never call it a clean push.** Never
pass `--admin` or `--force`. The measured case and the refused path: `references/domains-and-deploy.md` → "The
silent ruleset bypass" — read it before the first push. Law: `~/.claude/rules/docs-sites.md`.

## 3. 🔴 A docs repo is PUBLIC — no secret ever enters it

Only `.env.example` with placeholder values; real values live in `~/.secrets/` and the local deploy
environment. An absent key skips its provider entirely — a docs build must never need a secret. Sweep
`git ls-files` for env/secret/credential/key shapes before every commit; it must come back empty.

## 4. Content and configuration

Every page carries front matter — `title` and `description` are **not optional** (without them the page is
unsearchable and ships an empty meta description); `tags` power discovery. Organise by **content type** in
nested topic folders, link relatively, and set `onBrokenLinks: 'throw'` (+
`markdown.hooks.onBrokenMarkdownLinks: 'throw'`) so the build IS the link checker. Sidebars update in the
**same change** as a new category. Never edit plugin output — configure through `docusaurus.config.ts`.
Redirect, never delete, a URL. Details: `references/config.md`, `references/site-config.md`.

## 5. Search, analytics, AI audience

Local search, env-gated analytics, and output agents can read (raw Markdown, `/openapi.json`, `llms.txt`) —
read `references/search-analytics-ai.md` when wiring any of them.

🔴 **Never a canonical in `headTags`.** The theme emits one per route, and a global one doubles every page's
canonical. That was SA-P01 across the fleet's docs sites in the 2026-10-26 GSC audit. Also keep `/search` out
of the sitemap, make `themeConfig.image` a file that exists, and give every category a description. Audit
with `/search-audit` (`aoneahsan-cccs-search-audit`).

🔴 **Every docs site ships `/sitemap`, `/sitemap.xml`, `/feed` and `/feed.xml`**, like every frontend — the
checklist is in `references/site-config.md` → "The four routes checklist".

The pattern and its traps are in `references/site-config.md` → "Sitemap, feed and the four routes"; the contract
and the live audit are in `aoneahsan-cccs-sitemap` (2026-10-12, Rent Party docs).

## 6. Theming and build

Theming is Infima CSS variables (light `:root` + `[data-theme='dark']`) with `respectPrefersColorScheme` —
`references/theming-auth-capacitor.md`. Gate on `yarn build` (zero warnings) then `yarn serve` to verify the
real build. Test light + dark and 320→1920px — a docs site is a product surface.

## 7. The one exception: `ahsan-notebook`

The notebook uses Docusaurus and is named like docs, but it is the owner's **private personal project** —
never public, never GitHub Pages, never a public docs site, and exempt from everything above. It stays
private on Firebase Hosting behind a Google sign-in + email allowlist. **It is not a template:** its auth
gate, pagefind + Canary search, and Capacitor wrapper belong to it alone.

Full law: `~/.claude/rules/docs-sites.md` when present on this machine.
