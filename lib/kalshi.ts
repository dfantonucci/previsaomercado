import type { Market, MarketCategory, TrendingMarketRow } from "@/lib/market-types"
import { dedupeMarketsByEventGroup } from "@/lib/market-dedupe"
import { changeToTrend, marketToTrendingRow } from "@/lib/polymarket"

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2"
const MIN_LIQUIDITY_USD = 50
const MIN_VOLUME_COMBINED = 30
const SERIES_FETCH_LIMIT = 1500
const MAX_SERIES_TO_QUERY = 90
const MARKETS_PER_SERIES = 80
const SERIES_BATCH_SIZE = 12

const CATEGORY_PRIORITY: Record<string, number> = {
  Elections: 100,
  Politics: 98,
  Economics: 92,
  Financials: 90,
  Crypto: 88,
  "Science and Technology": 85,
  World: 78,
  Entertainment: 72,
  "Climate and Weather": 55,
  Companies: 80,
  Health: 50,
  Social: 40,
  Mentions: 40,
  Transportation: 45,
  Education: 50,
}

const FALLBACK_SERIES_TICKERS = [
  "KXFED",
  "KXBTC",
  "KXETH",
  "KXNVDA",
  "KXTSLA",
  "KXINX",
  "KXNASDAQ100",
  "KXWTI",
  "KXGTBOND",
]

const EXCLUDED_SERIES_CATEGORIES = new Set(["Sports"])

type KalshiApiMarket = {
  ticker: string
  title?: string
  market_type?: string
  status?: string
  close_time?: string
  expiration_time?: string
  mve_collection_ticker?: string
  mve_selected_legs?: unknown[] | null
  event_ticker?: string
  liquidity_dollars?: string
  volume_fp?: string
  volume_24h_fp?: string
  open_interest_fp?: string
  last_price_dollars?: string
  previous_price_dollars?: string
  yes_bid_dollars?: string
  yes_ask_dollars?: string
  result?: string
}

type KalshiSeries = {
  ticker?: string
  category?: string
}

function parseUsd(s: string | undefined): number {
  if (!s) return 0
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function inferKalshiCategory(title: string, eventTicker: string): MarketCategory {
  const q = `${title} ${eventTicker}`.toLowerCase()
  if (
    /election|president|senate|congress|vote |voting|governor|mayor|parliament|primary|ballot|electoral|house race|senate race/i.test(
      q
    )
  )
    return "elections"
  if (/bitcoin|btc|eth|ethereum|crypto|solana|defi|blockchain|coinbase/i.test(q))
    return "crypto"
  if (
    /\bfed\b|federal reserve|interest rate|cpi|inflation|gdp|treasury|bond|mortgage|recession|nasdaq|s&p|etf\b|fomc|rate cut|rate hike|jobs report|unemployment|yield|economic growth/i.test(
      q
    )
  )
    return "finance"
  if (
    /\bai\b|openai|chatgpt|nvidia|semiconductor|tech|software|google|microsoft|iphone|chip|gpt|llm/i.test(
      q
    )
  )
    return "technology"
  if (
    /oscar|grammy|netflix|movie|super bowl|eurovision|emoji|celebrity|album|spotify|disney|streaming/i.test(
      q
    )
  )
    return "culture"
  if (
    /china|iran|russia|ukraine|nato|war|military|israel|taiwan|trade war|sanctions|missile|invasion|ceasefire/i.test(
      q
    )
  )
    return "geopolitics"
  return "geopolitics"
}

function isKalshiSports(m: KalshiApiMarket): boolean {
  const et = (m.event_ticker ?? "").toUpperCase()
  if (
    /KX(NBA|NFL|NHL|MLB|UFC|ATP|NCAAF|NCAAB|NCAAMB|NBAGAME|NBASPREAD|NBATOTAL|NBAPTS|NBAREB|MLBGAME|MLBSPREAD|NHLGAME|UF|MVE|MVESPORT|MULTIGAME|UFCFIGHT)/i.test(
      et
    )
  )
    return true
  const t = (m.title ?? "").toLowerCase()
  const yesCount = (t.match(/\byes /g) ?? []).length
  if (yesCount >= 3) return true
  if (
    /\bwins by over\b|\bover \d+\.\d+ points scored\b|\bspread\b.*points|\bmoneyline\b/i.test(
      t
    )
  )
    return true
  return false
}

function isActiveUnexpired(m: KalshiApiMarket): boolean {
  if ((m.status ?? "").toLowerCase() !== "active") return false
  if (m.result && m.result.trim() !== "") return false
  const t = m.close_time || m.expiration_time
  if (!t) return true
  const d = new Date(t).getTime()
  if (!Number.isFinite(d)) return true
  return d > Date.now()
}

function kalshiVolumeScore(m: KalshiApiMarket): number {
  return Math.max(
    parseUsd(m.volume_fp),
    parseUsd(m.volume_24h_fp),
    parseUsd(m.liquidity_dollars),
    parseUsd(m.open_interest_fp),
    1
  )
}

function kalshiYesProbability(m: KalshiApiMarket): number | null {
  const yb = parseUsd(m.yes_bid_dollars)
  const ya = parseUsd(m.yes_ask_dollars)
  if (yb > 0 && ya > 0) {
    const mid = (yb + ya) / 2
    if (mid > 0 && mid < 1) return mid
  }
  const last = parseUsd(m.last_price_dollars)
  if (last > 0 && last <= 1) return last
  if (yb > 0 && yb < 1) return yb
  if (ya > 0 && ya < 1) return ya
  return null
}

function normalizeKalshiMarket(m: KalshiApiMarket): Market | null {
  if ((m.market_type ?? "").toLowerCase() !== "binary") return null
  if (!isActiveUnexpired(m)) return null
  if (m.mve_collection_ticker) return null
  if (m.mve_selected_legs && m.mve_selected_legs.length > 0) return null
  if (isKalshiSports(m)) return null

  const liq = parseUsd(m.liquidity_dollars)
  const vol = parseUsd(m.volume_fp) + parseUsd(m.volume_24h_fp)
  if (liq < MIN_LIQUIDITY_USD && vol < MIN_VOLUME_COMBINED) return null

  const p = kalshiYesProbability(m)
  if (p === null) return null

  const yesPct = Math.min(100, Math.max(0, Math.round(p * 100)))
  const noPct = 100 - yesPct
  const last = parseUsd(m.last_price_dollars)
  const prev = parseUsd(m.previous_price_dollars)
  const dayCh =
    Number.isFinite(last) && Number.isFinite(prev) ? last - prev : 0

  const eventKey = (m.event_ticker ?? "").trim().toUpperCase()

  return {
    id: `kalshi:${m.ticker}`,
    question: (m.title ?? "").trim() || m.ticker,
    category: inferKalshiCategory(m.title ?? "", m.event_ticker ?? ""),
    yesProbability: yesPct,
    noProbability: noPct,
    source: "kalshi",
    ...(eventKey ? { eventGroupKey: eventKey } : {}),
    volumeUsd: kalshiVolumeScore(m),
    dayPriceChange: dayCh,
  }
}

async function fetchKalshiSeriesTickers(): Promise<string[]> {
  const res = await fetch(
    `${KALSHI_BASE}/series?limit=${SERIES_FETCH_LIMIT}`,
    { next: { revalidate: 3600 }, headers: { Accept: "application/json" } }
  )
  if (!res.ok) throw new Error(`Kalshi series HTTP ${res.status}`)
  const j = (await res.json()) as { series?: KalshiSeries[] }
  const rows = Array.isArray(j.series) ? j.series : []
  const filtered = rows.filter(
    (s) =>
      s != null &&
      typeof s.ticker === "string" &&
      s.ticker.length > 0 &&
      s.category &&
      !EXCLUDED_SERIES_CATEGORIES.has(s.category)
  )
  filtered.sort(
    (a, b) =>
      (CATEGORY_PRIORITY[b.category ?? ""] ?? 0) -
      (CATEGORY_PRIORITY[a.category ?? ""] ?? 0)
  )
  const tickers: string[] = []
  const seen = new Set<string>()
  for (const s of filtered) {
    const t = s.ticker!
    if (seen.has(t)) continue
    seen.add(t)
    tickers.push(t)
    if (tickers.length >= MAX_SERIES_TO_QUERY) break
  }
  return tickers.length > 0 ? tickers : [...FALLBACK_SERIES_TICKERS]
}

async function fetchMarketsForSeries(seriesTicker: string): Promise<KalshiApiMarket[]> {
  const u = new URL(`${KALSHI_BASE}/markets`)
  u.searchParams.set("series_ticker", seriesTicker)
  u.searchParams.set("limit", String(MARKETS_PER_SERIES))
  const res = await fetch(u.toString(), {
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const j = (await res.json()) as { markets?: KalshiApiMarket[] }
  return Array.isArray(j.markets) ? j.markets : []
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const chunk = await Promise.all(batch.map(fn))
    out.push(...chunk)
  }
  return out
}

/** Mercados Kalshi normalizados: dedupe por ticker, depois um por evento (`eventGroupKey`). */
export async function fetchKalshiMarkets(): Promise<Market[]> {
  let seriesList: string[]
  try {
    seriesList = await fetchKalshiSeriesTickers()
  } catch {
    seriesList = [...FALLBACK_SERIES_TICKERS]
  }
  const merged = new Set(FALLBACK_SERIES_TICKERS)
  for (const t of seriesList) merged.add(t)
  const seriesToFetch = [...merged].slice(0, MAX_SERIES_TO_QUERY + 20)

  const marketChunks = await mapInBatches(
    seriesToFetch,
    SERIES_BATCH_SIZE,
    fetchMarketsForSeries
  )
  const flat = marketChunks.flat()

  const byId = new Map<string, Market>()
  for (const raw of flat) {
    const m = normalizeKalshiMarket(raw)
    if (!m) continue
    const prev = byId.get(m.id)
    if (!prev || prev.volumeUsd < m.volumeUsd) byId.set(m.id, m)
  }
  return dedupeMarketsByEventGroup(Array.from(byId.values()))
}

/** Linhas no mesmo formato que Polymarket para merge nos buckets. */
export async function fetchKalshiCandidateRows(): Promise<TrendingMarketRow[]> {
  const markets = await fetchKalshiMarkets()
  return markets.map((market) =>
    marketToTrendingRow(market, changeToTrend(market.dayPriceChange))
  )
}
