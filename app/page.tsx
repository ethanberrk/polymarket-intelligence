import { buildPageData } from '@/lib/transform'
import { CURATED_SECTIONS } from '@/config/curated-markets'
import { SiteHeader } from '@/components/SiteHeader'
import { EditionBar } from '@/components/EditionBar'
import { HomeContent } from '@/components/HomeContent'

export const revalidate = 600  // ISR: revalidate every 10 minutes

export default async function Page() {
  const data = await buildPageData(CURATED_SECTIONS)
  if (!data) throw new Error('Failed to fetch Polymarket data')

  return (
    <>
      <EditionBar data={data} />
      <SiteHeader fetchedAt={data.fetchedAt} />
      <HomeContent sections={data.sections} trending={data.trending} />
    </>
  )
}
