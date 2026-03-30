# Dynamic Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded `config/curated-markets.ts` slugs with a daily pipeline that fetches Polymarket markets, ingests RSS headlines, calls Claude to cluster them into story sections, and stores the result in Vercel KV — with `page.tsx` reading from KV and falling back to the static config.

**Architecture:** A Vercel Cron job hits `/api/refresh-sections` daily at 5am UTC. That route fetches ~500 active Polymarket markets, filters to `volume24h >= $5k`, caps at top-20 per category, fetches headlines from 8 RSS feeds, and calls Claude Haiku to cluster into editorially-voiced story sections stored in Vercel KV. `page.tsx` reads structure from KV (falling back to static config) and still fetches live odds from Polymarket every 5 minutes via ISR.

**Tech Stack:** Next.js 16 App Router, `@vercel/kv`, `@anthropic-ai/sdk`, `rss-parser`, Jest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/types.ts` | Modify | Add `Headline` type |
| `lib/rss.ts` | Create | Fetch + parse RSS feeds → `Headline[]` |
| `lib/kv.ts` | Create | Read/write `curated_sections` from Vercel KV |
| `lib/polymarket.ts` | Modify | Add `fetchAllMarkets()` + `filterAndCapMarkets()` |
| `lib/cluster.ts` | Create | Call Claude API, build prompt, parse response |
| `app/api/refresh-sections/route.ts` | Create | Cron endpoint — orchestrates the pipeline |
| `app/page.tsx` | Modify | Read sections from KV, fall back to static config |
| `vercel.json` | Modify | Add cron job config |
| `__tests__/lib/rss.test.ts` | Create | Tests for RSS fetching |
| `__tests__/lib/kv.test.ts` | Create | Tests for KV helpers |
| `__tests__/lib/polymarket.test.ts` | Modify | Tests for new functions |
| `__tests__/lib/cluster.test.ts` | Create | Tests for clustering |
| `__tests__/app/api/refresh-sections.test.ts` | Create | Tests for cron route |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the three required packages**

```bash
cd /Users/ethanberk/polymarket-intelligence
npm install @vercel/kv @anthropic-ai/sdk rss-parser
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify packages appear in package.json dependencies**

```bash
grep -E "vercel/kv|anthropic-ai|rss-parser" package.json
```

Expected output: three lines showing the installed packages and their versions.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @vercel/kv, @anthropic-ai/sdk, rss-parser"
```

---

## Task 2: Add `Headline` type to `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the `Headline` interface to the end of `lib/types.ts`**

Open `lib/types.ts` and append after the `PageData` interface:

```typescript
export interface Headline {
  title: string
  source: string
  publishedAt: string  // ISO string or RSS pubDate string
}
```

- [ ] **Step 2: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected output: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Headline type to lib/types"
```

---

## Task 3: Implement `lib/rss.ts`

**Files:**
- Create: `lib/rss.ts`
- Create: `__tests__/lib/rss.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/rss.test.ts`:

```typescript
import { fetchHeadlines } from '@/lib/rss'

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Big Story Today</title>
      <pubDate>Mon, 30 Mar 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Story</title>
      <pubDate>Mon, 30 Mar 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchHeadlines', () => {
  it('returns parsed headlines from successful feeds', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => MOCK_RSS,
    })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
    const titles = headlines.map(h => h.title)
    expect(titles).toContain('Big Story Today')
    expect(titles).toContain('Second Story')
  })

  it('attaches the correct source name to each headline', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => MOCK_RSS,
    })
    const headlines = await fetchHeadlines()
    const sources = new Set(headlines.map(h => h.source))
    // At least one known source name should appear
    expect([...sources].some(s => s.length > 0)).toBe(true)
  })

  it('skips a failed feed and returns results from the rest', async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ ok: true, text: async () => MOCK_RSS })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
  })

  it('returns empty array when all feeds fail', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('All down'))
    const headlines = await fetchHeadlines()
    expect(headlines).toEqual([])
  })

  it('skips feed that returns non-ok HTTP status', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, text: async () => '' })
      .mockResolvedValue({ ok: true, text: async () => MOCK_RSS })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/lib/rss.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/rss'`

- [ ] **Step 3: Implement `lib/rss.ts`**

```typescript
import Parser from 'rss-parser'
import type { Headline } from './types'

const parser = new Parser()

const RSS_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
  { url: 'https://feeds.apnews.com/rss/apf-topnews', source: 'AP' },
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://rss.politico.com/politics-news.xml', source: 'Politico' },
  { url: 'https://feeds.axios.com/axios-codebook-politics', source: 'Axios' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
  { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
]

async function fetchFeed(feed: { url: string; source: string }): Promise<Headline[]> {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return []
    const text = await res.text()
    const result = await parser.parseString(text)
    return (result.items ?? [])
      .filter(item => Boolean(item.title))
      .map(item => ({
        title: item.title!,
        source: feed.source,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

export async function fetchHeadlines(): Promise<Headline[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed))
  return results.flat()
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/rss.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/rss.ts __tests__/lib/rss.test.ts
git commit -m "feat: add lib/rss — fetch and parse RSS headlines"
```

---

## Task 4: Implement `lib/kv.ts`

**Files:**
- Create: `lib/kv.ts`
- Create: `__tests__/lib/kv.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/kv.test.ts`:

```typescript
import type { CuratedSection } from '@/lib/types'

const mockGet = jest.fn()
const mockSet = jest.fn()

jest.mock('@vercel/kv', () => ({
  kv: { get: mockGet, set: mockSet },
}))

import { getSections, setSections } from '@/lib/kv'

const MOCK_SECTIONS: Omit<CuratedSection, 'markets'>[] = [
  {
    id: 'politics',
    label: 'Politics',
    intro: 'Test intro.',
    narrative: 'Test narrative.',
    slugs: ['slug-1', 'slug-2', 'slug-3'],
  },
]

beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
})

describe('getSections', () => {
  it('returns sections from KV when present', async () => {
    mockGet.mockResolvedValue(MOCK_SECTIONS)
    const result = await getSections()
    expect(result).toEqual(MOCK_SECTIONS)
    expect(mockGet).toHaveBeenCalledWith('curated_sections')
  })

  it('returns null when KV has no value', async () => {
    mockGet.mockResolvedValue(null)
    const result = await getSections()
    expect(result).toBeNull()
  })

  it('returns null when KV throws', async () => {
    mockGet.mockRejectedValue(new Error('KV unavailable'))
    const result = await getSections()
    expect(result).toBeNull()
  })
})

describe('setSections', () => {
  it('writes sections to KV under the correct key', async () => {
    mockSet.mockResolvedValue('OK')
    await setSections(MOCK_SECTIONS)
    expect(mockSet).toHaveBeenCalledWith('curated_sections', MOCK_SECTIONS)
  })

  it('propagates errors from KV set', async () => {
    mockSet.mockRejectedValue(new Error('Write failed'))
    await expect(setSections(MOCK_SECTIONS)).rejects.toThrow('Write failed')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/lib/kv.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/kv'`

- [ ] **Step 3: Implement `lib/kv.ts`**

```typescript
import { kv } from '@vercel/kv'
import type { CuratedSection } from './types'

const SECTIONS_KEY = 'curated_sections'

export async function getSections(): Promise<Omit<CuratedSection, 'markets'>[] | null> {
  try {
    return await kv.get<Omit<CuratedSection, 'markets'>[]>(SECTIONS_KEY)
  } catch {
    return null
  }
}

export async function setSections(sections: Omit<CuratedSection, 'markets'>[]): Promise<void> {
  await kv.set(SECTIONS_KEY, sections)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/kv.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/kv.ts __tests__/lib/kv.test.ts
git commit -m "feat: add lib/kv — Vercel KV helpers for curated sections"
```

---

## Task 5: Add `fetchAllMarkets` and `filterAndCapMarkets` to `lib/polymarket.ts`

**Files:**
- Modify: `lib/polymarket.ts`
- Modify: `__tests__/lib/polymarket.test.ts`

- [ ] **Step 1: Write the failing tests**

In `__tests__/lib/polymarket.test.ts`, first update the existing import line at the top of the file:

```typescript
// Change this line:
import { fetchMarketsBySlug, fetchTrendingMarkets, polymarketUrl } from '@/lib/polymarket'
// To:
import { fetchMarketsBySlug, fetchTrendingMarkets, polymarketUrl, fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
```

Then append these two new `describe` blocks after the existing tests:

```typescript
const makeMarket = (overrides: Partial<RawMarket> = {}): RawMarket => ({
  id: '1',
  slug: 'test',
  question: 'Q?',
  outcomes: '["Yes","No"]',
  outcomePrices: '["0.5","0.5"]',
  volume: '10000',
  volume24hr: '10000',
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [{ id: '1', label: 'Politics' }],
  ...overrides,
})

describe('fetchAllMarkets', () => {
  it('fetches and returns all active markets', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [makeMarket()],
    })
    const result = await fetchAllMarkets()
    expect(result).toHaveLength(1)
    const url = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('active=true')
    expect(url).toContain('limit=500')
  })

  it('throws when API returns non-ok status', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchAllMarkets()).rejects.toThrow('fetchAllMarkets failed')
  })

  it('returns empty array when API returns non-array', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => null })
    const result = await fetchAllMarkets()
    expect(result).toEqual([])
  })
})

describe('filterAndCapMarkets', () => {
  it('drops markets below the volume24h floor', () => {
    const markets = [
      makeMarket({ slug: 'liquid', volume24hr: '10000' }),
      makeMarket({ slug: 'dead', volume24hr: '100' }),
    ]
    const result = filterAndCapMarkets(markets)
    expect(result.map(m => m.slug)).toContain('liquid')
    expect(result.map(m => m.slug)).not.toContain('dead')
  })

  it('drops inactive and closed markets', () => {
    const markets = [
      makeMarket({ slug: 'active', active: true, closed: false }),
      makeMarket({ slug: 'inactive', active: false, closed: false }),
      makeMarket({ slug: 'closed', active: true, closed: true }),
    ]
    const result = filterAndCapMarkets(markets)
    expect(result.map(m => m.slug)).toEqual(['active'])
  })

  it('caps at top N per category by volume24h', () => {
    const markets = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `market-${i}`, volume24hr: String(10000 + i * 100) })
    )
    const result = filterAndCapMarkets(markets, 5000, 20)
    expect(result.length).toBe(20)
  })

  it('keeps top-N across multiple categories', () => {
    const politics = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `pol-${i}`, tags: [{ id: '1', label: 'Politics' }], volume24hr: '10000' })
    )
    const crypto = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `cryp-${i}`, tags: [{ id: '2', label: 'Crypto' }], volume24hr: '10000' })
    )
    const result = filterAndCapMarkets([...politics, ...crypto], 5000, 20)
    const polCount = result.filter(m => m.slug.startsWith('pol-')).length
    const crypCount = result.filter(m => m.slug.startsWith('cryp-')).length
    expect(polCount).toBe(20)
    expect(crypCount).toBe(20)
  })

  it('uses "Other" category for markets with no tags', () => {
    const market = makeMarket({ slug: 'no-tag', tags: [] })
    const result = filterAndCapMarkets([market])
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/lib/polymarket.test.ts --no-coverage
```

Expected: FAIL — `fetchAllMarkets is not a function` and `filterAndCapMarkets is not a function`

- [ ] **Step 3: Add `fetchAllMarkets` and `filterAndCapMarkets` to `lib/polymarket.ts`**

Append to the end of `lib/polymarket.ts`:

```typescript
export async function fetchAllMarkets(): Promise<RawMarket[]> {
  const res = await fetch(
    'https://gamma-api.polymarket.com/markets?active=true&limit=500'
  )
  if (!res.ok) throw new Error(`Gamma API fetchAllMarkets failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export function filterAndCapMarkets(
  markets: RawMarket[],
  minVolume24h = 5000,
  capPerCategory = 20
): RawMarket[] {
  const liquid = markets.filter(
    m => m.active && !m.closed && parseFloat(m.volume24hr) >= minVolume24h
  )

  const byCategory = new Map<string, RawMarket[]>()
  for (const market of liquid) {
    const cat = market.tags[0]?.label ?? 'Other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(market)
  }

  const result: RawMarket[] = []
  for (const catMarkets of byCategory.values()) {
    const top = [...catMarkets]
      .sort((a, b) => parseFloat(b.volume24hr) - parseFloat(a.volume24hr))
      .slice(0, capPerCategory)
    result.push(...top)
  }
  return result
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/polymarket.test.ts --no-coverage
```

Expected: PASS — all existing tests + 8 new tests

- [ ] **Step 5: Commit**

```bash
git add lib/polymarket.ts __tests__/lib/polymarket.test.ts
git commit -m "feat: add fetchAllMarkets and filterAndCapMarkets to lib/polymarket"
```

---

## Task 6: Implement `lib/cluster.ts`

**Files:**
- Create: `lib/cluster.ts`
- Create: `__tests__/lib/cluster.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/cluster.test.ts`:

```typescript
import type { RawMarket, Headline, CuratedSection } from '@/lib/types'

const mockCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { clusterMarkets } from '@/lib/cluster'

const makeMarket = (slug: string): RawMarket => ({
  id: slug,
  slug,
  question: `Will ${slug} happen?`,
  outcomes: '["Yes","No"]',
  outcomePrices: '["0.6","0.4"]',
  volume: '100000',
  volume24hr: '10000',
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [{ id: '1', label: 'Politics' }],
})

const makeHeadline = (title: string): Headline => ({
  title,
  source: 'Reuters',
  publishedAt: new Date().toISOString(),
})

const VALID_SECTIONS: Omit<CuratedSection, 'markets'>[] = [
  {
    id: 'us-politics',
    label: 'US Politics',
    intro: 'Key political markets.',
    narrative: 'Markets price a 60% chance of event.',
    slugs: ['market-a', 'market-b', 'market-c'],
    spotlightSlug: 'market-a',
    spotlightDescription: 'The headline market.',
  },
]

beforeEach(() => {
  mockCreate.mockReset()
})

describe('clusterMarkets', () => {
  it('returns parsed sections from valid Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(VALID_SECTIONS) }],
    })
    const markets = [makeMarket('market-a'), makeMarket('market-b'), makeMarket('market-c')]
    const headlines = [makeHeadline('Big story')]
    const result = await clusterMarkets(markets, headlines)
    expect(result).toEqual(VALID_SECTIONS)
  })

  it('strips markdown code fences from Claude response', async () => {
    const wrapped = '```json\n' + JSON.stringify(VALID_SECTIONS) + '\n```'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: wrapped }],
    })
    const result = await clusterMarkets([makeMarket('market-a'), makeMarket('market-b'), makeMarket('market-c')], [])
    expect(result).toEqual(VALID_SECTIONS)
  })

  it('throws when Claude returns empty array', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow(
      'empty'
    )
  })

  it('throws when Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json at all' }],
    })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow()
  })

  it('calls Claude with haiku model', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(VALID_SECTIONS) }],
    })
    await clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])
    const call = mockCreate.mock.calls[0][0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/lib/cluster.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/cluster'`

- [ ] **Step 3: Implement `lib/cluster.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { RawMarket, Headline, CuratedSection } from './types'

const client = new Anthropic()

function buildPrompt(marketsJson: string, headlinesJson: string): string {
  return `You are an editorial AI for "By the Odds", a news site that replaces traditional opinion journalism with prediction market probabilities.

Given the following active Polymarket markets and recent news headlines, organize the markets into story clusters for the site's homepage.

CATEGORIES (use exactly these, case-sensitive):
Politics | Economy | World | Sports | Crypto | Entertainment

MARKETS (JSON, sorted by 24h volume descending):
${marketsJson}

RECENT HEADLINES (JSON):
${headlinesJson}

INSTRUCTIONS:
- Group markets into story clusters based on shared topic
- Assign each cluster to exactly one of the six categories above
- Create 1-3 clusters per category (only include categories that have qualifying markets)
- Each cluster must contain 3-12 markets
- If a market has volume24h > 50000 but no strong news match, include it in the most relevant category anyway
- The "narrative" field must describe what the market PROBABILITIES are actually saying — not just the news angle. Lead with a number where possible (e.g. "Markets put 63% odds on...").
- The "intro" is 1-2 editorial sentences summarizing the story cluster
- Output ONLY valid JSON — no prose, no markdown fences, no explanation before or after

OUTPUT FORMAT (JSON array, each element matching this shape exactly):
[
  {
    "id": "kebab-case-id",
    "label": "Section Title",
    "intro": "1-2 sentence editorial summary.",
    "narrative": "What the market odds are actually saying.",
    "slugs": ["slug-1", "slug-2", "slug-3"],
    "spotlightSlug": "most-important-slug",
    "spotlightDescription": "1 sentence about why this market matters."
  }
]`
}

function parseClusterResponse(text: string): Omit<CuratedSection, 'markets'>[] {
  const json = text
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Claude returned empty or non-array response')
  }
  return parsed as Omit<CuratedSection, 'markets'>[]
}

export async function clusterMarkets(
  markets: RawMarket[],
  headlines: Headline[]
): Promise<Omit<CuratedSection, 'markets'>[]> {
  const marketsJson = JSON.stringify(
    markets.map(m => ({
      slug: m.slug,
      question: m.question,
      volume24h: parseFloat(m.volume24hr),
      tags: m.tags.map(t => t.label),
    }))
  )

  const headlinesJson = JSON.stringify(
    headlines.slice(0, 50).map(h => ({
      title: h.title,
      source: h.source,
      publishedAt: h.publishedAt,
    }))
  )

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(marketsJson, headlinesJson) }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseClusterResponse(text)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/cluster.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/cluster.ts __tests__/lib/cluster.test.ts
git commit -m "feat: add lib/cluster — Claude-powered market clustering"
```

---

## Task 7: Implement the cron route `app/api/refresh-sections/route.ts`

**Files:**
- Create: `app/api/refresh-sections/route.ts`
- Create: `__tests__/app/api/refresh-sections.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/api/refresh-sections.test.ts`:

```typescript
jest.mock('@/lib/polymarket', () => ({
  fetchAllMarkets: jest.fn(),
  filterAndCapMarkets: jest.fn(),
}))
jest.mock('@/lib/rss', () => ({
  fetchHeadlines: jest.fn(),
}))
jest.mock('@/lib/cluster', () => ({
  clusterMarkets: jest.fn(),
}))
jest.mock('@/lib/kv', () => ({
  setSections: jest.fn(),
}))

import { GET } from '@/app/api/refresh-sections/route'
import { fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import { fetchHeadlines } from '@/lib/rss'
import { clusterMarkets } from '@/lib/cluster'
import { setSections } from '@/lib/kv'
import type { CuratedSection } from '@/lib/types'

const MOCK_SECTIONS: Omit<CuratedSection, 'markets'>[] = [
  {
    id: 'politics',
    label: 'Politics',
    intro: 'Test.',
    narrative: 'Markets say 60%.',
    slugs: ['s1', 's2', 's3'],
  },
]

function makeRequest(secret?: string): Request {
  return new Request('http://localhost/api/refresh-sections', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  ;(fetchAllMarkets as jest.Mock).mockResolvedValue([])
  ;(filterAndCapMarkets as jest.Mock).mockReturnValue([])
  ;(fetchHeadlines as jest.Mock).mockResolvedValue([])
  ;(clusterMarkets as jest.Mock).mockResolvedValue(MOCK_SECTIONS)
  ;(setSections as jest.Mock).mockResolvedValue(undefined)
})

describe('GET /api/refresh-sections', () => {
  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 401 with wrong secret', async () => {
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 200 and calls setSections on success', async () => {
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sections).toBe(1)
    expect(setSections).toHaveBeenCalledWith(MOCK_SECTIONS)
  })

  it('passes filtered markets and headlines to clusterMarkets', async () => {
    const fakeMarkets = [{ slug: 'test' }]
    const fakeHeadlines = [{ title: 'Story', source: 'Reuters', publishedAt: '' }]
    ;(filterAndCapMarkets as jest.Mock).mockReturnValue(fakeMarkets)
    ;(fetchHeadlines as jest.Mock).mockResolvedValue(fakeHeadlines)
    await GET(makeRequest('test-secret'))
    expect(clusterMarkets).toHaveBeenCalledWith(fakeMarkets, fakeHeadlines)
  })

  it('returns 500 and does not call setSections when clusterMarkets throws', async () => {
    ;(clusterMarkets as jest.Mock).mockRejectedValue(new Error('Claude down'))
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(500)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 500 when fetchAllMarkets throws', async () => {
    ;(fetchAllMarkets as jest.Mock).mockRejectedValue(new Error('Polymarket down'))
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(500)
    expect(setSections).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/app/api/refresh-sections.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/refresh-sections/route'`

- [ ] **Step 3: Create the route directory and implement `route.ts`**

```bash
mkdir -p /Users/ethanberk/polymarket-intelligence/app/api/refresh-sections
```

Create `app/api/refresh-sections/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import { fetchHeadlines } from '@/lib/rss'
import { clusterMarkets } from '@/lib/cluster'
import { setSections } from '@/lib/kv'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [allMarkets, headlines] = await Promise.all([
      fetchAllMarkets(),
      fetchHeadlines(),
    ])

    const filtered = filterAndCapMarkets(allMarkets)
    const sections = await clusterMarkets(filtered, headlines)
    await setSections(sections)

    return NextResponse.json({ ok: true, sections: sections.length })
  } catch (err) {
    console.error('[refresh-sections]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/app/api/refresh-sections.test.ts --no-coverage
```

Expected: PASS — 6 tests

- [ ] **Step 5: Run the full test suite to confirm nothing is broken**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/refresh-sections/route.ts __tests__/app/api/refresh-sections.test.ts
git commit -m "feat: add /api/refresh-sections cron route"
```

---

## Task 8: Update `app/page.tsx` to read sections from KV

**Files:**
- Modify: `app/page.tsx`

This task has no dedicated unit test — the behavior (KV read + fallback) is covered by the KV tests in Task 4. The change is small enough that visual confirmation in dev is sufficient.

- [ ] **Step 1: Update `app/page.tsx`**

Replace the current contents of `app/page.tsx` with:

```typescript
import { buildPageData } from '@/lib/transform'
import { CURATED_SECTIONS } from '@/config/curated-markets'
import { getSections } from '@/lib/kv'
import { SiteHeader } from '@/components/SiteHeader'
import { EditionBar } from '@/components/EditionBar'
import { HomeContent } from '@/components/HomeContent'
import { AutoRefresh } from '@/components/AutoRefresh'

export const revalidate = 300  // ISR: revalidate every 5 minutes

export default async function Page() {
  const kvSections = await getSections()
  const sections = kvSections ?? CURATED_SECTIONS
  const data = await buildPageData(sections)
  if (!data) throw new Error('Failed to fetch Polymarket data')

  return (
    <>
      <AutoRefresh />
      <EditionBar data={data} />
      <SiteHeader fetchedAt={data.fetchedAt} />
      <HomeContent sections={data.sections} trending={data.trending} />
    </>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing is broken**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: read curated sections from Vercel KV in page.tsx, fall back to static config"
```

---

## Task 9: Add cron job to `vercel.json` and document env vars

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update `vercel.json` with the cron config**

Replace the contents of `vercel.json` with:

```json
{
  "crons": [
    {
      "path": "/api/refresh-sections",
      "schedule": "0 5 * * *"
    }
  ]
}
```

- [ ] **Step 2: Confirm the JSON is valid**

```bash
node -e "require('./vercel.json'); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Add required env vars to `.env.local` (local dev only — never commit this file)**

Add these lines to `.env.local` (create it if it doesn't exist):

```bash
# Vercel KV — copy from Vercel dashboard after adding a KV store
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Anthropic — copy from console.anthropic.com
ANTHROPIC_API_KEY=

# Cron auth — any strong random string, must match Vercel env var
CRON_SECRET=
```

- [ ] **Step 4: Confirm `.env.local` is in `.gitignore`**

```bash
grep ".env.local" .gitignore
```

Expected output: `.env.local` (confirming it's already ignored by Next.js default gitignore)

- [ ] **Step 5: Run the full test suite one final time**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Final commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron job for daily section refresh"
```

---

## Deployment Checklist

Before deploying to Vercel, complete these steps in the Vercel dashboard:

1. **Add a KV store** — Storage → Create → KV. This auto-populates the four `KV_*` env vars in your project.
2. **Add `ANTHROPIC_API_KEY`** — Settings → Environment Variables.
3. **Add `CRON_SECRET`** — Settings → Environment Variables. Use any strong random string (e.g. `openssl rand -hex 32`).
4. **Deploy** — `git push` triggers a Vercel deploy. The cron job activates automatically once the new `vercel.json` is live.
5. **Trigger a manual refresh** to seed KV before the first scheduled run:

```bash
curl -X GET https://your-domain.vercel.app/api/refresh-sections \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response: `{"ok":true,"sections":N}` where N is the number of section clusters Claude returned.
