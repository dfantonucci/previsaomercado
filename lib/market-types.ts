export type MarketCategory =
  | "geopolitics"
  | "crypto"
  | "elections"
  | "technology"
  | "finance"
  | "culture"

export type Market = {
  id: string
  question: string
  category: MarketCategory
  yesProbability: number
  noProbability: number
  source: "polymarket" | "kalshi"
  /**
   * Agrupa mercados do mesmo evento subjacente (ex.: `event_ticker` Kalshi).
   * Só camada de dados; não usado na UI.
   */
  eventGroupKey?: string
  /** Volume / liquidez em USD (aprox.; comparável para ranking). */
  volumeUsd: number
  /**
   * Variação 1d da probabilidade Yes (preço ~0–1), ex.: 0.02 ≈ +2 p.p.
   * Polymarket: `oneDayPriceChange`.
   */
  dayPriceChange: number
}

export type TrendingMarketRow = {
  id: string
  categoryId: string
  question: string
  category: string
  yesPercentage: number
  source: "Polymarket" | "Kalshi"
  trend: "up" | "down" | "stable"
  trendValue?: string
  volumeUsd: number
  dayPriceChange: number
}

export const TOP_MARKETS_PER_VIEW = 12

export type MarketsUiPayload = {
  buckets: Record<string, TrendingMarketRow[]>
}
