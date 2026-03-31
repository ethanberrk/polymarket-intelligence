import { buildPageData } from '@/lib/transform'
import { getSections, setSections } from '@/lib/kv'
import { fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import { clusterMarkets } from '@/lib/cluster'
import { SiteHeader } from '@/components/SiteHeader'
import { EditionBar } from '@/components/EditionBar'
import { HomeContent } from '@/components/HomeContent'
import { AutoRefresh } from '@/components/AutoRefresh'

export const revalidate = 300  // ISR: revalidate every 5 minutes

export default async function Page() {
  let sections = await getSections()
  if (!sections) {
    const allMarkets = await fetchAllMarkets()
    const filtered = filterAndCapMarkets(allMarkets)
    sections = clusterMarkets(filtered, [])
    setSections(sections) // fire-and-forget: seed KV for next request
  }
  const data = await buildPageData(sections)
  if (!data) throw new Error('Failed to fetch Polymarket data')

  return (
    <>
      <AutoRefresh />
      <EditionBar data={data} />
      <SiteHeader fetchedAt={data.fetchedAt} />
      <HomeContent sections={data.sections} trending={data.trending} />
    </>
  )
}
