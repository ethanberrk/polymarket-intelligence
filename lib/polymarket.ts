// lib/polymarket.ts — stub (full implementation in Task 5)
import type { RawMarket } from './types'

export const POLITICS_TAG_ID = '49'

export function polymarketUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`
}

const FETCH_BATCH_SIZE = 10

export async function fetchMarketsBySlug(slugs: string[]): Promise<RawMarket[]> {
  if (slugs.length === 0) return []
  const all: RawMarket[] = []
  for (let i = 0; i < slugs.length; i += FETCH_BATCH_SIZE) {
    const batch = slugs.slice(i, i + FETCH_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async slug => {
        const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}`)
        if (!res.ok) throw new Error(`Gamma API error for slug ${slug}: ${res.status}`)
        const data = await res.json()
        return Array.isArray(data) ? data : []
      })
    )
    all.push(...batchResults.flat())
  }
  return all
}

export async function fetchTrendingMarkets(): Promise<RawMarket[]> {
  const res = await fetch(
    `https://gamma-api.polymarket.com/markets?tag_id=${POLITICS_TAG_ID}&active=true&limit=200`
  )
  if (!res.ok) throw new Error(`Gamma API trending fetch failed: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[fetchTrendingMarkets] POLITICS_TAG_ID may be incorrect — trending returned 0 markets')
  }
  return Array.isArray(data) ? data : []
}
