import type { RawMarket, Headline, CuratedSection } from './types'

const CATEGORY_MAP: Record<string, string> = {
  Politics: 'Politics',
  'US Politics': 'Politics',
  'World Politics': 'Politics',
  Economy: 'Economy',
  Economics: 'Economy',
  Finance: 'Economy',
  Business: 'Economy',
  World: 'World',
  'World Events': 'World',
  International: 'World',
  Sports: 'Sports',
  Soccer: 'Sports',
  Football: 'Sports',
  Basketball: 'Sports',
  Baseball: 'Sports',
  Tennis: 'Sports',
  'Combat Sports': 'Sports',
  Golf: 'Sports',
  Racing: 'Sports',
  Crypto: 'Crypto',
  Cryptocurrency: 'Crypto',
  Bitcoin: 'Crypto',
  Ethereum: 'Crypto',
  DeFi: 'Crypto',
  Entertainment: 'Entertainment',
  'Pop Culture': 'Entertainment',
  Movies: 'Entertainment',
  Music: 'Entertainment',
  Television: 'Entertainment',
  Awards: 'Entertainment',
}

const CATEGORY_ORDER = ['Politics', 'Economy', 'World', 'Sports', 'Crypto', 'Entertainment']

function toId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-')
}

function topProbability(market: RawMarket): { outcome: string; probability: number } | null {
  try {
    const outcomes: string[] = JSON.parse(market.outcomes)
    const prices: string[] = JSON.parse(market.outcomePrices)
    let best = -1
    let bestIdx = 0
    for (let i = 0; i < prices.length; i++) {
      const p = parseFloat(prices[i])
      if (p > best) { best = p; bestIdx = i }
    }
    return { outcome: outcomes[bestIdx], probability: best }
  } catch {
    return null
  }
}

function buildNarrative(market: RawMarket): string {
  const prob = topProbability(market)
  if (!prob) return market.question
  const pct = Math.round(prob.probability * 100)
  if (prob.outcome === 'Yes') {
    return `Markets put ${pct}% odds on: ${market.question}`
  }
  return `Markets put ${pct}% on "${prob.outcome}" for: ${market.question}`
}

export function clusterMarkets(
  markets: RawMarket[],
  _headlines: Headline[]
): Omit<CuratedSection, 'markets'>[] {
  const grouped = new Map<string, RawMarket[]>()

  for (const market of markets) {
    const rawTag = market.tags[0]?.label ?? ''
    const category = CATEGORY_MAP[rawTag] ?? null
    if (!category) continue
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category)!.push(market)
  }

  const sections: Omit<CuratedSection, 'markets'>[] = []

  for (const category of CATEGORY_ORDER) {
    const catMarkets = grouped.get(category)
    if (!catMarkets || catMarkets.length < 3) continue

    const sorted = [...catMarkets].sort(
      (a, b) => parseFloat(b.volume24hr) - parseFloat(a.volume24hr)
    )

    const slugs = sorted.slice(0, 12).map(m => m.slug)
    const spotlight = sorted[0]

    sections.push({
      id: toId(category),
      label: category,
      intro: `The most actively traded ${category.toLowerCase()} markets right now.`,
      narrative: buildNarrative(spotlight),
      slugs,
      spotlightSlug: spotlight.slug,
      spotlightDescription: spotlight.question,
    })
  }

  if (sections.length === 0) {
    throw new Error('No sections could be built from the provided markets')
  }

  return sections
}
