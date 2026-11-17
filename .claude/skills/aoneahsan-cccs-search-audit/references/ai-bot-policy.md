# AI bot policy — owner decision 2026-10-27

**Allow all AI bots on public pages: search, user-fetch and training.** Private routes are disallowed for
**every** group. Asked in the /search-audit design session, the owner chose "Allow all AI bots".

| Purpose | Bots | Policy |
|---|---|---|
| Search indexing | `Googlebot`, `Bingbot`, `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Applebot`, `DuckDuckBot`, `YandexBot` | allow public |
| User-initiated fetch | `ChatGPT-User`, `Claude-User`, `Perplexity-User` | allow public (OpenAI says robots may not apply to user fetches) |
| Training / grounding | `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `meta-externalagent` | allow public (owner choice) |

🔴 **The group trap (SA-P07).** A named group replaces `*` for that bot, so the private Disallow block is
repeated in every named group. Generate it from one list. Never hand-write it.

```text
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account
Disallow: /api/

User-agent: GPTBot
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account
Disallow: /api/
# …the same block for each bot in the table…

Sitemap: https://<this-host>/sitemap.xml
Sitemap: https://<sibling-docs-host>/sitemap.xml
```

- Use the project's real private prefixes. They are an example above, not a list to copy.
- Writing `Disallow: /admin` without the trailing slash covers `/admin` and everything under it.
- 🔴 A route that should be absent from results gets `noindex` and leaves the sitemap. Disallowing it as well
  hides the noindex (`-search-indexing`).

**What this policy does not change:**
- a project's own documented privacy promise wins, and a conflict is an owner question;
- `noarchive`, `nosnippet` or `nocache` set deliberately stay set (AI-03);
- client projects keep their own policy.

Official references, verified 2026-10-26 by the GSC agent: Google AI features guide, OpenAI bots page and
Anthropic crawler article (links in `gsc-audit-2026-10-26/ai-search-audit-guidance-2026-10-26.md`).
Re-verify a bot name online before adding it, and record the source in the learning inbox.
