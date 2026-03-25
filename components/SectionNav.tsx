import type { CuratedSection } from '@/lib/types'

interface SectionNavProps {
  sections: CuratedSection[]
}

export function SectionNav({ sections }: SectionNavProps) {
  const activeSections = sections.filter(s => s.markets.length > 0)
  if (activeSections.length === 0) return null
  return (
    <nav className="section-nav" aria-label="Section navigation">
      {activeSections.map(section => (
        <a key={section.id} href={`#${section.id}`}>{section.label}</a>
      ))}
    </nav>
  )
}
