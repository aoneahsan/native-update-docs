# Learning inbox — macleanup, 2026-10-30

- Static multi-page sites copy the head per file: run the social-image probe on every sitemap URL, not the home page and a sample (six of seven pages lacked og:image).
- A docs `llms.txt` version bumped before `npm publish` creates the opposite AI-05 mismatch; order is publish → docs.
- `ugrep` refuses some `.{0,80}(a|b).{0,80}` patterns on UTF-8 HTML and prints nothing ("exceeds complexity limits") — a probe that lies by silence; strip tags with `python3 -I` instead.
- Docusaurus writes unquoted attributes (`rel=canonical href=…`); a canonical regex expecting quotes reports a false "missing".
- Cloudflare Pages serves `404.html` as a 200 route at `/404`; do not read it as a soft 404.
- A hero animation starting at `opacity:0` renders blank in static WebKit (Quick Look); confirm the `<h1>` is in the HTML before reporting an empty page.
- A sole-collaborator public repo's ruleset can drop the PR rule when touched (public-repo-governance, 2026-09-27); applied to aoneahsan/macleanup ruleset 18940380.
