import type { RawMarket, Outcome, PolymarketMarket, CuratedSection, PageData } from './types'
import { fetchMarketsBySlug, fetchTrendingMarkets } from './polymarket'

export function normalizeOutcomes(market: RawMarket): Outcome[] {
  let labels: string[]
  let rawPrices: string[]
  try {
    labels = JSON.parse(market.outcomes)
    rawPrices = JSON.parse(market.outcomePrices)
  } catch {
    return []
  }
  if (labels.length !== rawPrices.length || labels.length === 0) return []
  const prices = rawPrices.map(p => { const n = parseFloat(p); return isNaN(n) ? 0 : n })
  const total = prices.reduce((sum, p) => sum + p, 0)
  if (total === 0) return []
  return labels.map((label, i) => ({ label, probability: prices[i] / total }))
}

function transformMarket(raw: RawMarket, category: string): PolymarketMarket {
  return {
    id: raw.id,
    slug: raw.slug,
    question: raw.question,
    category,
    volume: parseFloat(raw.volume) || 0,
    volume24h: parseFloat(raw.volume24hr) || 0,
    outcomes: normalizeOutcomes(raw),
    endDate: raw.endDate,
    active: raw.active,
  }
}

export async function buildPageData(
  sections: Omit<CuratedSection, 'markets'>[]
): Promise<PageData | null> {
  const fetchedAt = new Date().toISOString()
  try {
    const allSlugs = Array.from(new Set(sections.flatMap(s => s.slugs)))
    const [curatedRaw, trendingRaw] = await Promise.all([
      fetchMarketsBySlug(allSlugs),
      fetchTrendingMarkets(),
    ])

    const slugToCategory = new Map<string, string>()
    for (const section of sections) {
      for (const slug of section.slugs) {
        if (!slugToCategory.has(slug)) slugToCategory.set(slug, section.id)
      }
    }

    const rawBySlug = new Map<string, RawMarket>(curatedRaw.map(m => [m.slug, m]))
    const marketBySlug = new Map<string, PolymarketMarket>()
    for (const [slug, raw] of rawBySlug) {
      marketBySlug.set(slug, transformMarket(raw, slugToCategory.get(slug) ?? 'unknown'))
    }

    const populatedSections: CuratedSection[] = sections.map(section => ({
      ...section,
      markets: section.slugs
        .map(slug => marketBySlug.get(slug))
        .filter((m): m is PolymarketMarket => m !== undefined),
    }))

    const trending = trendingRaw
      .map(m => transformMarket(m, 'trending'))
      .filter(m => {
        if (m.outcomes.length === 0) return false
        const maxProb = Math.max(...m.outcomes.map(o => o.probability))
        return maxProb < 0.99
      })
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10)

    const allMarkets = populatedSections.flatMap(s => s.markets)

    return {
      fetchedAt,
      sections: populatedSections,
      trending,
      totalMarkets: allMarkets.length,
      totalVolume: allMarkets.reduce((sum, m) => sum + m.volume, 0),
    }
  } catch (err) {
    console.error('[buildPageData] Failed to fetch Polymarket data:', err)
    return null
  }
}
