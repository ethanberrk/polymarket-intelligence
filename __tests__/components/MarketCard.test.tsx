import { render, screen } from '@testing-library/react'
import { MarketCard } from '@/components/MarketCard'
import type { PolymarketMarket } from '@/lib/types'

const makeMarket = (overrides: Partial<PolymarketMarket> = {}): PolymarketMarket => ({
  id: '1', slug: 'test-market', question: 'Will X happen?',
  category: 'test', volume: 1000000, volume24h: 50000,
  endDate: '2026-12-31', active: true,
  outcomes: [
    { label: 'Yes', probability: 0.65 },
    { label: 'No', probability: 0.35 },
  ],
  ...overrides,
})

describe('MarketCard', () => {
  it('renders the market question', () => {
    render(<MarketCard market={makeMarket()} />)
    expect(screen.getByText('Will X happen?')).toBeInTheDocument()
  })

  it('renders probability as percentage for each outcome', () => {
    render(<MarketCard market={makeMarket()} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
  })

  it('links to Polymarket event page', () => {
    render(<MarketCard market={makeMarket()} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://polymarket.com/event/test-market')
  })

  it('shows top 4 outcomes and Other row for markets with 5+ outcomes', () => {
    const market = makeMarket({
      outcomes: [
        { label: 'A', probability: 0.3 },
        { label: 'B', probability: 0.25 },
        { label: 'C', probability: 0.2 },
        { label: 'D', probability: 0.15 },
        { label: 'E', probability: 0.06 },
        { label: 'F', probability: 0.04 },
      ],
    })
    render(<MarketCard market={market} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByText('E')).not.toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })
})
