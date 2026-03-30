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
