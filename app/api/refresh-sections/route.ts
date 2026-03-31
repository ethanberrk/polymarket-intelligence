import { NextResponse } from 'next/server'
import { fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import { fetchHeadlines } from '@/lib/rss'
import { clusterMarkets } from '@/lib/cluster'
import { setSections } from '@/lib/kv'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [allMarkets, headlines] = await Promise.all([
      fetchAllMarkets(),
      fetchHeadlines(),
    ])

    const filtered = filterAndCapMarkets(allMarkets)
    const sections = clusterMarkets(filtered, headlines)
    await setSections(sections)

    return NextResponse.json({ ok: true, sections: sections.length })
  } catch (err) {
    console.error('[refresh-sections]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
