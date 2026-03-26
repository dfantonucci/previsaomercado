import type { Market, MarketCategory, TrendingMarketRow } from "@/lib/market-types"

export type { Market, MarketCategory } from "@/lib/market-types"

const GAMMA_MARKETS =
  "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=500&order=volume24hr&ascending=false"

export type GammaMarket = {
  id: string
  question: string
  outcomes?: string
  outcomePrices?: string
  active?: boolean
  closed?: boolean
  sportsMarketType?: string
  oneDayPriceChange?: number
  volume?: string
  volumeNum?: number
  events?: Array<{
    slug?: string
    title?: string
    electionType?: string
    seriesSlug?: string
  }>
}

function gammaVolumeUsd(m: GammaMarket): number {
  if (typeof m.volumeNum === "number" && Number.isFinite(m.volumeNum)) {
    return Math.max(0, m.volumeNum)
  }
  const v = Number.parseFloat(String(m.volume ?? "0"))
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function isBinaryYesNo(m: GammaMarket): boolean {
  const outcomes = parseJsonArray(m.outcomes)
  return (
    outcomes.length === 2 &&
    outcomes[0] === "Yes" &&
    outcomes[1] === "No"
  )
}

function looksLikeSports(m: GammaMarket): boolean {
  const q = m.question.toLowerCase()
  if (m.sportsMarketType) return true
  if (/\bvs\.?\b/.test(q)) return true
  if (/^(spread|o\/u|total):/i.test(q)) return true
  const slug = m.events?.[0]?.slug ?? ""
  if (/\b(nba|nhl|nfl|mlb|wnba|ufc|f1)\b/i.test(slug)) return true
  return false
}

function inferCategory(m: GammaMarket): MarketCategory {
  const q = `${m.question} ${m.events?.[0]?.title ?? ""}`.toLowerCase()
  const slug = (m.events?.[0]?.slug ?? "").toLowerCase()

  if (m.events?.[0]?.electionType) return "elections"
  if (
    /election|president|parliament|vote|senate|congress|trump|biden|lula|hungary|primary|referendum|ballot|governor race|midterm/i.test(
      q
    )
  )
    return "elections"
  if (
    /bitcoin|ethereum|crypto|btc|eth|solana|defi|stablecoin|dogecoin|xrp|ripple|blockchain/i.test(
      q
    )
  )
    return "crypto"
  if (
    /openai|gpt|apple|google|microsoft|nvidia|\bai\b|chip|tesla|tech\b|software|semiconductor|iphone|android|meta quest/i.test(
      q
    )
  )
    return "technology"
  if (
    /\bfed\b|federal reserve|interest rate|inflation|recession|\bs&p\b|nasdaq|dow jones|\bgdp\b|unemployment|mortgage|treasury|bond yield|stock index|earnings\b|\bipo\b|forex|ecb rate|bank of japan|options market|hedge fund|yield curve|rate cut|rate hike|\bcpi\b|\bppi\b|central bank|jpmorgan|goldman|morgan stanley|blackrock|etf\b|junk bond/i.test(
      q
    )
  )
    return "finance"
  if (
    /oscar|grammy|emmy|golden globe|super bowl|box office|billboard|\bnetflix\b|disney\+?|\bspotify\b|met gala|\btiktok\b|\byoutube\b|coachella|cannes|celebrity|\bmovie\b|\bfilm\b|\bmusic award\b|streaming|\balbum\b|\bconcert\b|video game award|esports|taylor swift|beyonc|grammys|oscars|eurovision|eurovis(ão|ao)|televote|cristo|jesus christ|\bjesus\b|terremoto|alienígena|\baliens?\b|extraterrestrial|\bufo\b|#\s*tweets|number of tweets|quantos tweets|musk.*tweet/i.test(
      q
    )
  )
    return "culture"
  if (
    /iran|china|taiwan|israel|russia|ukraine|nato|war|military|forces|invasion|ceasefire|offensive|netanyahu|syria|gaza|lebanon/i.test(
      q
    )
  )
    return "geopolitics"
  if (/politics|geopolitics|foreign|sanctions|trade war/i.test(slug)) {
    return "geopolitics"
  }
  return "geopolitics"
}

function pricesToYesNo(outcomePrices: string | undefined): {
  yes: number
  no: number
} | null {
  const arr = parseJsonArray(outcomePrices)
  if (arr.length < 2) return null
  const yes = Number.parseFloat(arr[0] ?? "")
  const no = Number.parseFloat(arr[1] ?? "")
  if (!Number.isFinite(yes) || !Number.isFinite(no)) return null
  return {
    yes: Math.min(1, Math.max(0, yes)),
    no: Math.min(1, Math.max(0, no)),
  }
}

export function changeToTrend(
  oneDay: number | undefined
): { trend: "up" | "down" | "stable"; trendValue: string } {
  if (oneDay === undefined || !Number.isFinite(oneDay)) {
    return { trend: "stable", trendValue: "0%" }
  }
  const pct = oneDay * 100
  if (pct > 0.5) {
    return { trend: "up", trendValue: `+${pct.toFixed(0)}%` }
  }
  if (pct < -0.5) {
    return { trend: "down", trendValue: `${pct.toFixed(0)}%` }
  }
  return { trend: "stable", trendValue: "0%" }
}

const CATEGORY_UI: Record<
  MarketCategory,
  { categoryId: string; label: string }
> = {
  geopolitics: { categoryId: "geopolitica", label: "Geopolítica" },
  elections: { categoryId: "eleicoes", label: "Eleições" },
  crypto: { categoryId: "cripto", label: "Cripto" },
  technology: { categoryId: "tecnologia", label: "Tecnologia" },
  finance: { categoryId: "financas", label: "Finanças" },
  culture: { categoryId: "cultura", label: "Cultura" },
}

export function normalizeGammaMarketOrNull(m: GammaMarket): Market | null {
  if (!m.active || m.closed) return null
  if (!isBinaryYesNo(m)) return null
  if (looksLikeSports(m)) return null

  const yn = pricesToYesNo(m.outcomePrices)
  if (!yn) return null

  const yesPct = Math.round(yn.yes * 100)
  const noPct = Math.round(yn.no * 100)
  const volumeUsd = gammaVolumeUsd(m)
  const dayPriceChange =
    typeof m.oneDayPriceChange === "number" &&
    Number.isFinite(m.oneDayPriceChange)
      ? m.oneDayPriceChange
      : 0

  return {
    id: String(m.id),
    question: m.question.trim(),
    category: inferCategory(m),
    yesProbability: yesPct,
    noProbability: noPct,
    source: "polymarket" as const,
    volumeUsd,
    dayPriceChange,
  }
}

export function marketToTrendingRow(
  market: Market,
  trend: { trend: "up" | "down" | "stable"; trendValue: string }
): TrendingMarketRow {
  const ui = CATEGORY_UI[market.category]
  const rounded = Math.round(market.yesProbability)
  const yesPct = Math.max(1, Math.min(100, rounded))
  return {
    id: market.id,
    categoryId: ui.categoryId,
    question: market.question,
    category: ui.label,
    yesPercentage: yesPct,
    source: market.source === "kalshi" ? "Kalshi" : "Polymarket",
    trend: trend.trend,
    trendValue: trend.trendValue,
    volumeUsd: market.volumeUsd,
    dayPriceChange: market.dayPriceChange,
  }
}

async function fetchGammaJson(): Promise<GammaMarket[]> {
  const res = await fetch(GAMMA_MARKETS, {
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Polymarket HTTP ${res.status}`)
  }
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error("Polymarket: invalid payload")
  }
  return data as GammaMarket[]
}

async function fetchPolymarketData(): Promise<{
  markets: Market[]
  candidates: TrendingMarketRow[]
}> {
  const raw = await fetchGammaJson()
  const pairMap = new Map<string, { gm: GammaMarket; market: Market }>()

  for (const gm of raw) {
    const market = normalizeGammaMarketOrNull(gm)
    if (!market) continue
    const prev = pairMap.get(market.id)
    if (!prev || prev.market.volumeUsd < market.volumeUsd) {
      pairMap.set(market.id, { gm, market })
    }
  }

  const pairs = Array.from(pairMap.values())
  if (pairs.length === 0) {
    throw new Error("Polymarket: no markets after filter")
  }

  const markets: Market[] = []
  const candidates: TrendingMarketRow[] = []

  for (let i = 0; i < pairs.length; i++) {
    const m = pairs[i].market
    const trend = changeToTrend(pairs[i].gm.oneDayPriceChange)
    markets.push(m)
    candidates.push(marketToTrendingRow(m, trend))
  }

  return { markets, candidates }
}

/** Mercados normalizados (lista completa deduplicada por id). */
export async function fetchPolymarketMarkets(): Promise<Market[]> {
  const { markets } = await fetchPolymarketData()
  return markets
}

/** Candidatos para montar buckets top-12 por categoria no servidor. */
export async function fetchPolymarketCandidateRows(): Promise<
  TrendingMarketRow[]
> {
  const { candidates } = await fetchPolymarketData()
  return candidates
}
