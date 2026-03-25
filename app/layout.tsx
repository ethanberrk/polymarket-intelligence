import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'State of US Politics — Polymarket Intelligence',
  description: 'Live prediction market probabilities across US elections, foreign policy, legislation, and executive power.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Anti-FOCT: reads localStorage before paint to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
