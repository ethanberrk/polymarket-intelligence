import Parser from 'rss-parser'
import type { Headline } from './types'

const parser = new Parser()

const RSS_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
  { url: 'https://feeds.apnews.com/rss/apf-topnews', source: 'AP' },
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://rss.politico.com/politics-news.xml', source: 'Politico' },
  { url: 'https://feeds.axios.com/axios-codebook-politics', source: 'Axios' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
  { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
]

async function fetchFeed(feed: { url: string; source: string }): Promise<Headline[]> {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return []
    const text = await res.text()
    const result = await parser.parseString(text)
    return (result.items ?? [])
      .filter(item => Boolean(item.title))
      .map(item => ({
        title: item.title!,
        source: feed.source,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

export async function fetchHeadlines(): Promise<Headline[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed))
  return results.flat()
}
