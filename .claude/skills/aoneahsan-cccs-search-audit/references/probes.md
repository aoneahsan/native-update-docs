# Probes — the read-only command set

All probes are **unauthenticated GETs against our own origins**, at ≤ 1 request per 0.3 s. They never sign
in, never fetch customer pages and never submit anything. Run them directly in Bash: these are commands, not
script files (`00-house-rules.md`). Save the raw output under `<run>/evidence/search/` so the report can quote
it.

🔴 **Watch every probe fail once.** Before trusting a probe in a project, run it on a known-bad URL from the
baseline and confirm it reports FAIL (`build-test-quality.md`: a gate you have not watched fail is not a
gate). The 2026-10-27 calibration set is at the bottom.

```bash
O=https://example.aoneahsan.com        # one origin at a time
EV=<run>/evidence/search; mkdir -p "$EV"
UA='Mozilla/5.0 (compatible; aoneahsan-search-audit)'
```

## head — status, MIME, redirects for one URL

```bash
curl -sS -o /dev/null -L -A "$UA" -w '%{http_code} %{content_type} %{num_redirects} %{url_effective}\n' "$O/robots.txt"
```

Run it for `/`, `/robots.txt`, `/sitemap.xml`, `/sitemap`, `/feed`, `/feed.xml`, `/llms.txt`,
`/.well-known/assetlinks.json` (Android projects) and `/<uuid>` (SA-P11).
- robots must be `text/plain`;
- sitemap and feed must be XML;
- llms must be text or markdown;
- `/<uuid>` must be **404**.

## sitemap-locs — every URL, index-aware

```bash
curl -sS -A "$UA" "$O/sitemap.xml" > "$EV/sitemap.xml"; xmllint --noout "$EV/sitemap.xml" && echo XML-OK
grep -oP '(?<=<loc>)[^<]+' "$EV/sitemap.xml" > "$EV/locs.txt"
# sitemap index? fetch each child once, then append its locs
grep -q '<sitemapindex' "$EV/sitemap.xml" && for s in $(cat "$EV/locs.txt"); do curl -sS -A "$UA" "$s" | grep -oP '(?<=<loc>)[^<]+'; sleep 0.3; done > "$EV/locs-children.txt"
wc -l "$EV"/locs*.txt
```

Take the off-host locs (SA-P08) and the utility routes (SA-P06) from the same list:

```bash
H=${O#https://}; grep -v "^https://$H\(/\|$\)" "$EV/locs.txt"                   # off-host → FAIL unless intended
grep -E '/(login|signin|sign-in|register|signup|sign-up|auth|dashboard|account|admin|settings|search|logout|reset|verify|onboarding|checkout|connect)(/|$)' "$EV/locs.txt"
```

## canon-sweep — one self-canonical per page, plus description and robots meta (SA-P01, P02, P13, AI-03)

```bash
while read -r u; do
  h=$(curl -sSL -A "$UA" "$u")
  c=$(grep -oiE '<link[^>]*rel=["'"'"']?canonical["'"'"']?[^>]*>' <<<"$h" | grep -oiE 'href=["'"'"']?[^"'"'"' >]+' | sed -E "s/^href=[\"']?//" | sort -u)
  n=$(grep -oiE '<link[^>]*rel=["'"'"']?canonical' <<<"$h" | wc -l)
  # Quotes optional: minified HTML (Docusaurus with @docusaurus/faster) writes name=description unquoted.
  d=$(grep -ciE '<meta[^>]*name=["'"'"']?description["'"'"']?[^>]*content=["'"'"']?[^"'"'"' >]+' <<<"$h")
  r=$(grep -oiE '<meta[^>]*name=["'"'"']?robots["'"'"']?[^>]*>' <<<"$h" | head -1)
  echo "$n|$d|$u|$(tr '\n' ' ' <<<"$c")|$r"; sleep 0.3
done < "$EV/locs.txt" > "$EV/canon.tsv"
awk -F'|' '$1!=1 || $2<1' "$EV/canon.tsv"                        # FAIL rows: ≠1 canonical or no description
awk -F'|' '$1==1 { split($4,a," "); if (a[1]!=$3) print }' "$EV/canon.tsv"   # canonical ≠ own URL
grep -i noindex "$EV/canon.tsv"                                  # a listed page must never be noindex
```

🔴 **Minified output drops attribute quotes** (`<link data-rh=true rel=canonical href=https://…/>`, Docusaurus 3, ClearHire
docs 2026-10-29): an extractor that needs a quote returns an empty canonical and every row reads "canonical ≠ URL". The
`href` match above takes quoted and unquoted values. 🔴 **Count tags, not lines:** a sitemap or feed is often ONE line, so
`grep -c '<lastmod>'` answers 1; use `grep -o '<lastmod>' | wc -l`.

Also check whether the canonical tags differ (SA-P01, one route canonical plus one root canonical): the
first awk prints the row with `n=2`. Run the sample (`head -20 locs.txt`) first, then the full list.

## assets — every declared preview image and icon (SA-P03)

🔴 Match the property exactly: a bare `og:image` prefix also catches `og:image:alt`, whose text is then fetched
as a relative URL and reported 404 (zaions.com, 2026-11-10).

```bash
curl -sSL -A "$UA" "$O/" > "$EV/home.html"
grep -oiE '<meta[^>]*(property|name)=["'"'"']?(og:image|og:image:secure_url|twitter:image)["'"'"' ][^>]*>|<link[^>]*rel=["'"'"'][^"'"'"']*icon[^"'"'"']*["'"'"'][^>]*>' "$EV/home.html" \
 | grep -oiE '(content|href)=["'"'"'][^"'"'"']+' | sed -E 's/^(content|href)=.//' | sort -u | while read -r a; do
   case "$a" in http*) u="$a";; /*) u="$O$a";; *) u="$O/$a"; echo "RELATIVE $a";; esac
   curl -sS -o /dev/null -L -A "$UA" -w "%{http_code} %{content_type} $u\n" "$u"; sleep 0.3; done
grep -ciE 'og:image' "$EV/home.html"                             # 0 → FAIL (no preview image at all)
```

PASS needs 200 and `image/*` for every asset. A 200 with `text/html` is the SPA fallback (FAIL). Open each
image and look at it.

## robots-effective — what each bot may fetch (SA-P07, AI-01)

```bash
curl -sS -A "$UA" "$O/robots.txt" > "$EV/robots.txt"
python3 -I -c '
import sys
# LONGEST MATCH, ties to Allow — Google`s rule. urllib.robotparser is FIRST-match and reported every
# Disallow as allowed in groups that start with "Allow: /" (labflow 2026-10-29: 14 bots shown Y/dashboard on a correct file).
groups, rules, cur = {}, None, []
for raw in open(sys.argv[1]).read().splitlines():
    line = raw.split("#")[0].strip()
    if not line: continue
    k, _, v = line.partition(":"); k, v = k.strip().lower(), v.strip()
    if k == "user-agent":
        if rules: cur, rules = [], None
        if rules is None: rules = []
        cur.append(v.lower()); groups.update({a: rules for a in cur})
    elif k in ("allow", "disallow") and rules is not None: rules.append((k, v))
def ok(bot, path):
    best = ("allow", "")
    for kind, v in groups.get(bot.lower(), groups.get("*", [])):
        if v and path.startswith(v) and (len(v) > len(best[1]) or (len(v) == len(best[1]) and kind == "allow")): best = (kind, v)
    return best[0] == "allow"
bots = ["*","Googlebot","Bingbot","OAI-SearchBot","ChatGPT-User","GPTBot","Claude-SearchBot","Claude-User","ClaudeBot","PerplexityBot","Google-Extended","Applebot","CCBot"]
for b in bots: print(b.ljust(18), " ".join(("Y" if ok(b, p) else "n") + p for p in sys.argv[2:]))
' "$EV/robots.txt" / /admin/x /dashboard/x /account/x /settings/x /api/x /login
grep -i '^sitemap:' "$EV/robots.txt"                              # each line → head probe → 200 XML (SA-P09)
```

- PASS needs `Y/` for every bot and `n` for every private prefix the project has.
- Use the project's real private prefixes, which you read from its `robots.txt` `*` group and its route registry.
- 🔴 Test a **child** path (`/admin/x`), not the bare prefix. `Disallow: /admin/` does not cover `/admin`
  itself. Calibration 2026-10-27 reported `/admin` "allowed" on a correct file. When the bare page is
  private too, the rule must be `Disallow: /admin`.
- 🔴 Python's parser is a first-match approximation, not Google's longest-match. Confirm any surprise by
  reading the group by eye. **Since 2026-10-29 the probe above evaluates longest-match itself** (labflow learning
  inbox `2026-10-29-2229-labflow.md` §1); calibrate it on a file with `Allow: /` before a `Disallow` (must print `n`).

## feed — RSS parses (SA-P05)

```bash
curl -sS -A "$UA" "$O/feed.xml" > "$EV/feed.xml"; xmllint --noout "$EV/feed.xml" && grep -c '<item>' "$EV/feed.xml"
```

## soft404 — unknown and absent children (SA-P11)

```bash
for p in "/$(cat /proc/sys/kernel/random/uuid)" /features/zz-absent /tools/zz-absent /blog/zz-absent /docs/zz-absent; do
  curl -sS -o "$EV/s404.html" -A "$UA" -w "%{http_code} $p " "$O$p"; grep -oiE '<title>[^<]*' "$EV/s404.html" | head -1; sleep 0.3; done
```

- Only the families the project really has count.
- FAIL on a 200 whose title or canonical equals the homepage's.
- The historical URLs come from the baseline file.

## built output — reproduce before the fix

```bash
grep -rlo 'rel="canonical"' build/ dist/ 2>/dev/null | head; grep -rc 'rel="canonical"' build/**/index.html 2>/dev/null | grep -v ':1$'
```

The built-output check is the same canon-sweep run against `yarn serve` / `npx -y serve dist` on the project's
port. Stop the server afterwards.

## 🔴 Calibration set (2026-10-27: observed FAIL/PASS, re-run when a probe changes)

| Probe | Known-bad (must FAIL) | Known-good (must PASS) |
|---|---|---|
| canon-sweep | `https://empora-docs.aoneahsan.com/changelog/archive` (2 canonicals; **fixed by 2026-10-29: 1 canonical, no longer a known-bad**; plant two `<link rel=canonical>` tags in a local string instead) | `https://fileshub-docs.zaions.com/` leaves |
| assets | a planted absent path on the host under test, e.g. `https://rentparty-docs.aoneahsan.com/img/zz-absent.png` (404); LifeWell's `/img/social-card.png` was the known-bad until it was fixed (200 `image/png` on 2026-10-28) | LifeWell app favicon |
| head (llms) | `https://stratastorage.aoneahsan.com/llms.txt` (200 HTML) | a docs-site `llms.txt` |
| head (sitemap) | `https://tools.zaions.com/sitemaps.xml` (404) | `https://ztools.zaions.com/sitemap.xml` |
| sitemap-locs utility | `https://labflow.aoneahsan.com/sitemap.xml` (`/login`) | — |
| soft404 | `https://smsapp.aoneahsan.com/zz-<uuid>` and `https://stratastorage.aoneahsan.com/zz-<uuid>` (200) | `https://ztools.zaions.com/zz-<uuid>` (404) |

LifeWell's `/features/heart-rate-zones` (the audit's 200 home shell) already answered **404** on 2026-10-27,
so it was fixed after the audit. A row stops being "known-bad" once it is fixed. Then pick the next open baseline record as the
known-bad, or plant the defect in a local build.
