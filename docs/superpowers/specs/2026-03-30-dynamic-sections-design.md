# Dynamic Sections Design

**Date:** 2026-03-30
**Project:** By the Odds (polymarket-intelligence)

## Problem

`config/curated-markets.ts` contains hardcoded Polymarket market slugs organized into manually curated sections. These go stale as markets resolve and the news cycle moves. The site needs to self-manage what it shows — no manual curation.

## Goal

Replace hardcoded section config with a fully automated pipeline that surfaces the most relevant, liquid Polymarket markets organized into editorially coherent story clusters, updated daily.

---

## Architecture

Two update cycles run independently:

### Cycle 1 — Section Structure (daily, 5am UTC)
A Vercel Cron job hits `GET /api/refresh-sections`. That route:
1. Fetches all active Polymarket markets from the Gamma API
2. Filters to markets with `volume24h >= $5k`
3. Groups by Polymarket tag, takes top 20 per category
4. Fetches recent headlines from 8 RSS feeds in parallel (30s timeout each)
5. Sends markets + headlines to Claude API with a structured clustering prompt
6. Validates the JSON response
7. If valid: writes to Vercel KV as `curated_sections` + updates `curated_sections_updated_at`
8. If invalid or any step fails: leaves KV untouched (previous value survives)

### Cycle 2 — Live Odds (every 5 minutes, unchanged)
`page.tsx` reads section structure from Vercel KV, then fetches live market odds from Polymarket Gamma API. ISR `revalidate = 300` stays in place.

---

## Market Filtering

**Stage 1 — Global floor:** Drop any market with `volume24h < $5,000`. Removes dead/illiquid markets.

**Stage 2 — Per-category cap:** Within each Polymarket tag/category, take the top 20 by `volume24h`. Equal caps across all categories. Prevents high-volume categories (crypto, politics) from dominating the Claude prompt.

**Result:** ~160 markets sent to Claude per daily run.

---

## Claude Clustering

**Input:**
- Fixed category list: `Politics | Economy | World | Sports | Crypto | Entertainment`
- Filtered market list: `{ slug, question, volume24h, tags }`
- Headline list: `{ title, source, publishedAt }` — last 50 headlines across all feeds
- Output JSON schema matching `CuratedSection` (without `markets` field)

**Clustering rules baked into the prompt:**
- Each story cluster maps to exactly one top-level category
- 1–3 story clusters per category, no more
- Min 3 markets per cluster, max 12
- High-volume markets with no clear news match still included if `volume24h > $50k`
- Resolved/inactive markets excluded before sending
- Output must be valid JSON only — no prose, no markdown wrapper

**Key narrative instruction:** For each cluster, the `narrative` field must reflect what the market *probabilities* are actually saying — not just what the news says. This preserves the editorial voice that makes the site distinct.

**Token estimate:** ~7k input tokens per run. Model: `claude-haiku-4-5-20251001`. Cost: ~$0.001/day.

---

## RSS Sources

| Category | Feed |
|---|---|
| General | Reuters Top News, AP Top Headlines |
| Politics/Policy | Politico, Axios |
| World/Business | BBC World, Financial Times |
| Crypto | CoinDesk |
| Sports | ESPN Top Headlines |

All free, no API key required. Fetched in parallel. If a feed is down, skip it and proceed with whatever headlines are available.

---

## Error Handling

| Failure | Behavior |
|---|---|
| Polymarket API down | Abort refresh, KV unchanged |
| All RSS feeds fail | Proceed with markets-only (Claude clusters by volume + tags) |
| Claude API fails | Abort refresh, KV unchanged |
| Claude returns invalid JSON | Abort refresh, KV unchanged |
| KV read fails on page load | Fall back to static `CURATED_SECTIONS` from config file |
| Market slug missing from Gamma API | Silently dropped from that section's market list |

---

## Files

### New
- `app/api/refresh-sections/route.ts` — cron endpoint
- `lib/rss.ts` — RSS fetching and parsing
- `lib/cluster.ts` — Claude API call and prompt
- `lib/kv.ts` — Vercel KV read/write helpers

### Modified
- `lib/transform.ts` — `buildPageData()` reads from KV instead of static config
- `vercel.json` — add cron job
- `.env.local` / Vercel dashboard — new env vars

### Unchanged (becomes fallback only)
- `config/curated-markets.ts` — retained as static fallback if KV is empty

---

## Environment Variables

| Variable | Source |
|---|---|
| `CRON_SECRET` | Manual — shared secret to authorize cron calls |
| `ANTHROPIC_API_KEY` | Anthropic dashboard |
| `KV_URL` | Auto-populated by Vercel when KV store is added |
| `KV_REST_API_URL` | Auto-populated by Vercel |
| `KV_REST_API_TOKEN` | Auto-populated by Vercel |
| `KV_REST_API_READ_ONLY_TOKEN` | Auto-populated by Vercel |

---

## Cron Schedule

```json
{ "path": "/api/refresh-sections", "schedule": "0 5 * * *" }
```

5am UTC daily — after overnight US news cycle settles, before US morning traffic peak.
