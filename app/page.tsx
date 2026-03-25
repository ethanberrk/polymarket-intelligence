import { buildPageData } from '@/lib/transform'
import { CURATED_SECTIONS } from '@/config/curated-markets'
import { SiteHeader } from '@/components/SiteHeader'
import { Hero } from '@/components/Hero'
import { SectionNav } from '@/components/SectionNav'
import { Section } from '@/components/Section'
import { TrendingSection } from '@/components/TrendingSection'

export const revalidate = 600  // ISR: revalidate every 10 minutes

export default async function Page() {
  const data = await buildPageData(CURATED_SECTIONS)
  if (!data) throw new Error('Failed to fetch Polymarket data')

  return (
    <>
      <SiteHeader fetchedAt={data.fetchedAt} />
      <main className="page-wrapper">
        <Hero data={data} />
        <SectionNav sections={data.sections} />
        {data.sections.map(section => (
          <Section key={section.id} section={section} />
        ))}
        <TrendingSection markets={data.trending} />
      </main>
    </>
  )
}
