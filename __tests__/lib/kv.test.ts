import type { CuratedSection } from '@/lib/types'

jest.mock('@vercel/kv', () => ({
  kv: { get: jest.fn(), set: jest.fn() },
}))

import { getSections, setSections } from '@/lib/kv'

const { kv } = jest.requireMock('@vercel/kv') as { kv: { get: jest.Mock; set: jest.Mock } }
const mockGet = kv.get
const mockSet = kv.set

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
