// lib/types.ts

export interface RawMarket {
  id: string
  slug: string
  question: string
  outcomes: string        // JSON string array: '["Yes","No"]'
  outcomePrices: string   // JSON string array: '["0.65","0.35"]' — parallel to outcomes
  volume: string          // float string
  volume24hr: string      // float string
  endDate: string
  active: boolean
  closed: boolean
  tags: { id: string; label: string }[]
}

export interface Outcome {
  label: string
  probability: number     // 0–1, normalized
}

export interface PolymarketMarket {
  id: string
  slug: string
  question: string
  category: string        // section.id or "trending"
  volume: number
  volume24h: number
  outcomes: Outcome[]
  endDate: string
  active: boolean
}

export interface CuratedSection {
  id: string
  label: string
  intro: string           // section subtitle paragraph
  narrative: string       // Semafor-style editorial callout
  slugs: string[]         // Polymarket market slugs in display order
  spotlightSlug?: string
  spotlightDescription?: string
  markets: PolymarketMarket[]  // populated by buildPageData()
}

export interface PageData {
  fetchedAt: string       // ISO timestamp; set at start of buildPageData()
  sections: CuratedSection[]
  trending: PolymarketMarket[]
  totalMarkets: number
  totalVolume: number
}
