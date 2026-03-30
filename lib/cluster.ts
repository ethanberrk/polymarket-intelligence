import Anthropic from '@anthropic-ai/sdk'
import type { RawMarket, Headline, CuratedSection } from './types'

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

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(marketsJson, headlinesJson) }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseClusterResponse(text)
}
