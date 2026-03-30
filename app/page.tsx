import { buildPageData } from '@/lib/transform'
import { CURATED_SECTIONS } from '@/config/curated-markets'
import { getSections } from '@/lib/kv'
import { SiteHeader } from '@/components/SiteHeader'
import { EditionBar } from '@/components/EditionBar'
import { HomeContent } from '@/components/HomeContent'
import { AutoRefresh } from '@/components/AutoRefresh'

export const revalidate = 300  // ISR: revalidate every 5 minutes

export default async function Page() {
  const kvSections = await getSections()
  const sections = kvSections ?? CURATED_SECTIONS
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
