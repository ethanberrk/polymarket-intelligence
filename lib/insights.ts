import type { PolymarketMarket, CuratedSection } from './types'

/**
 * Gets the key probability signal from a market — used as the leading number in the sidebar.
 * For Yes/No markets: returns the Yes probability.
 * For multi-outcome: returns the top outcome + its probability.
 */
export function getMarketSignal(market: PolymarketMarket): {
  pct: number
  label: string
} | null {
  if (market.outcomes.length === 0) return null

  const isYesNo =
    market.outcomes.length === 2 &&
    market.outcomes.some(o => o.label.toLowerCase() === 'yes') &&
    market.outcomes.some(o => o.label.toLowerCase() === 'no')

  if (isYesNo) {
    const yes = market.outcomes.find(o => o.label.toLowerCase() === 'yes')!
    return { pct: Math.round(yes.probability * 100), label: 'Yes' }
  }

  const top = [...market.outcomes].sort((a, b) => b.probability - a.probability)[0]
  return { pct: Math.round(top.probability * 100), label: top.label }
}

/**
 * Returns the first sentence of a string (up to the first period or 120 chars).
 */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/)
  if (match) return match[0].trim()
  if (text.length > 120) return text.slice(0, 117).trimEnd() + '…'
  return text.trim()
}

/**
 * Derives the sidebar entry for a section — spotlight market probability
 * combined with the section's hand-crafted narrative.
 */
export function getSectionInsight(section: CuratedSection): {
  signal: { pct: number; label: string }
  question: string
  narrative: string
} | null {
  const market = section.spotlightSlug
    ? section.markets.find(m => m.slug === section.spotlightSlug)
    : [...section.markets].sort((a, b) => b.volume - a.volume)[0]

  if (!market) return null

  const signal = getMarketSignal(market)
  if (!signal) return null

  const narrative = firstSentence(section.narrative || section.intro || market.question)
  return { signal, question: market.question, narrative }
}
