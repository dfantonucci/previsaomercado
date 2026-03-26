import type { MarketsUiPayload, TrendingMarketRow } from "@/lib/market-types"
import { TOP_MARKETS_PER_VIEW } from "@/lib/market-types"

const CATEGORY_IDS = [
  "geopolitica",
  "eleicoes",
  "cripto",
  "tecnologia",
  "financas",
  "cultura",
] as const

/**
 * Relevância = maior entre (volume normalizado) e (|Δprob 1d| normalizado).
 * Empate: maior volume absoluto.
 */
function relevanceScore(
  row: TrendingMarketRow,
  maxVol: number,
  maxAbsDelta: number
): number {
  const volN = maxVol > 0 ? row.volumeUsd / maxVol : 0
  const abs = Math.abs(row.dayPriceChange)
  const deltaN = maxAbsDelta > 0 ? abs / maxAbsDelta : 0
  return Math.max(volN, deltaN)
}

function sortByRelevance(rows: TrendingMarketRow[]): TrendingMarketRow[] {
  if (rows.length === 0) return []
  const maxVol = Math.max(...rows.map((r) => r.volumeUsd), 0)
  const maxAbs = Math.max(
    ...rows.map((r) => Math.abs(r.dayPriceChange)),
    0
  )
  const volScale = maxVol > 0 ? maxVol : 1
  const deltaScale = maxAbs > 0 ? maxAbs : 1

  return [...rows].sort((a, b) => {
    const s =
      relevanceScore(b, volScale, deltaScale) -
      relevanceScore(a, volScale, deltaScale)
    if (s !== 0) return s
    return b.volumeUsd - a.volumeUsd
  })
}

/**
 * Top N por relevância (volume ou movimento 1d) em cada categoria e top N geral em `all`.
 */
export function buildMarketBuckets(
  candidates: TrendingMarketRow[]
): MarketsUiPayload {
  const top = TOP_MARKETS_PER_VIEW
  const buckets: Record<string, TrendingMarketRow[]> = {}

  for (const catId of CATEGORY_IDS) {
    const inCat = candidates.filter((c) => c.categoryId === catId)
    buckets[catId] = sortByRelevance(inCat).slice(0, top)
  }

  buckets.all = sortByRelevance([...candidates]).slice(0, top)

  return { buckets }
}
