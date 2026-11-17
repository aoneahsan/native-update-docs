# 2026-11-16 — rentparty (run 2026-11-16-1140)

- **Missing probe: `pricing.md`.** The white-label close criteria and the SEO optimizer both name `pricing.md`, but no
  SA pattern probed it, so Rent Party shipped white-label pages for three days with `/pricing.md` 404 on both hosts.
  Probe: `curl -s -o /dev/null -w '%{http_code} %{content_type}' https://<host>/pricing.md` → expect `200 text/markdown`.
  Fix recipe that cannot drift: write it at build time beside `llms.txt` from the plan rows and the pricing pages' own
  words; link the white-label pages instead of copying FilesHub admin prices.
- **Not a defect: three `<h1>` per prerendered page** on projects that prerender a web composition, an app composition
  and a no-script body; only one is shown. Count visible headings, not tags.
