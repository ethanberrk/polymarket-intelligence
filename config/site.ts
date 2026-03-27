// Site-wide configuration
// Replace POLYMARKET_REF with your actual referral code from the Polymarket affiliate dashboard
export const POLYMARKET_REF = 'YOUR_REF_CODE'

export function polymarketUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}?ref=${POLYMARKET_REF}`
}
