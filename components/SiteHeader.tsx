import { LastUpdated } from './LastUpdated'

interface SiteHeaderProps {
  fetchedAt: string
}

export function SiteHeader({ fetchedAt }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left" />
        <div className="header-center">
          <a href="#" className="site-logo">By The Odds</a>
        </div>
        <div className="header-right">
          <LastUpdated fetchedAt={fetchedAt} />
        </div>
      </div>
    </header>
  )
}
