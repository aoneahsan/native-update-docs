# 2026-11-16 — pregnancypal (delta)

- **New surface type checked: white-label pages.** Price consistency across HTML, `pricing.md` and JSON-LD is best proven against the licensing service's own `POST /quote` (web + mobile = 18,000), not against the catalogue alone, because the discount is computed server-side.
- **A thank-you page must be noindex and out of the sitemap.** Both held here; worth a catalogue line for every product with a post-purchase page.
- **Probe lie avoided:** `/white-label/verify` 404s by design; the verifier lives at `/verify-license`. Read `frozen-urls.ts` before guessing a route.
