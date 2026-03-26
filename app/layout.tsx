import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'By The Odds',
  description: 'Live prediction market probabilities across politics, economics, and world events — aggregated from the largest prediction markets.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
      <body>{children}</body>
    </html>
  )
}
