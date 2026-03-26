import type { TrendingMarketRow } from "@/lib/market-types"

/** Máximo de mercados após ranking. */
export const TOP_RANKED_MARKETS = 15

/** Se o conjunto “estrito” for menor, usar lista completa (sem dedupe de pergunta). */
const MIN_RANKED_STRICT = 8

/** Com dados suficientes, mostrar pelo menos este número de mercados. */
const MIN_MARKETS_DISPLAY = 12

/** Volume de referência (USD) para o declive da penalidade em log (≈ penalidade mínima → ~nula). */
const VOLUME_PENALTY_REF_USD = 80_000

/**
 * Penalidade suave para volume baixo (0.88–1). Multiplica só o termo de volume (40%).
 */
function lowVolumePenalty(volumeUsd: number): number {
  const v = Math.max(0, volumeUsd)
  const t = Math.log1p(v) / Math.log1p(VOLUME_PENALTY_REF_USD)
  return 0.88 + 0.12 * Math.min(1, Math.max(0, t))
}

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function exactDuplicateKey(row: TrendingMarketRow): string {
  return `${row.categoryId}|${normalizeQuestion(row.question)}`
}

function pickBetterTrendingDuplicate(a: TrendingMarketRow, b: TrendingMarketRow): TrendingMarketRow {
  const volEps = 1e-6
  if (b.volumeUsd - a.volumeUsd > volEps) return b
  if (a.volumeUsd - b.volumeUsd > volEps) return a
  const ex = (r: TrendingMarketRow) => Math.abs(r.yesPercentage - 50)
  const exA = ex(a)
  const exB = ex(b)
  if (exB !== exA) return exB < exA ? b : a
  return a.id <= b.id ? a : b
}

/** Um mercado por id (mantém o de maior volume). */
export function dedupeByTrendingId(rows: TrendingMarketRow[]): TrendingMarketRow[] {
  const byId = new Map<string, TrendingMarketRow>()
  for (const r of rows) {
    const prev = byId.get(r.id)
    if (!prev || prev.volumeUsd < r.volumeUsd) byId.set(r.id, r)
  }
  return Array.from(byId.values())
}

/**
 * Remove apenas duplicados exatos (mesma categoria + mesma pergunta normalizada).
 */
export function dedupeExactQuestion(rows: TrendingMarketRow[]): TrendingMarketRow[] {
  const byKey = new Map<string, TrendingMarketRow>()
  for (const r of rows) {
    const key = exactDuplicateKey(r)
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, r)
      continue
    }
    byKey.set(key, pickBetterTrendingDuplicate(prev, r))
  }
  return Array.from(byKey.values())
}

function minMax01(values: number[], degenerate: number): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max <= min + 1e-12) return values.map(() => degenerate)
  return values.map((v) => (v - min) / (max - min))
}

function yesProbability01(row: TrendingMarketRow): number {
  const p = row.yesPercentage / 100
  if (!Number.isFinite(p)) return 0.5
  return Math.min(1, Math.max(0, p))
}

/** uncertaintyScore = 1 - abs(probability - 0.5) * 2  (probabilidade em 0–1) */
function uncertaintyScore(prob01: number): number {
  return 1 - Math.abs(prob01 - 0.5) * 2
}

type Scored = { row: TrendingMarketRow; score: number }

function scoreAndSort(rows: TrendingMarketRow[]): Scored[] {
  if (rows.length === 0) return []

  const logVols = rows.map((r) => Math.log1p(Math.max(0, r.volumeUsd)))
  const absDeltas = rows.map((r) => Math.abs(r.dayPriceChange))

  const volumeScores = minMax01(logVols, 1)
  const momentumScores = minMax01(absDeltas, 0)

  const scored: Scored[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const volS = volumeScores[i] ?? 0
    const volPen = lowVolumePenalty(row.volumeUsd)
    const volTerm = volS * volPen
    const momS = momentumScores[i] ?? 0
    const uncS = uncertaintyScore(yesProbability01(row))
    const score = volTerm * 0.4 + momS * 0.3 + uncS * 0.3
    scored.push({ row, score })
  }

  scored.sort((a, b) => b.score - a.score || b.row.volumeUsd - a.row.volumeUsd)
  return scored
}

export type RankedMarketsResult = {
  ranked: TrendingMarketRow[]
  scoreById: Map<string, number>
}

/**
 * Ordena por relevância (40% volume com penalidade suave a baixo volume, 30% momentum, 30% incerteza),
 * dedupe exato por pergunta, ou lista completa com id-dedupe se poucos resultados.
 */
export function rankMarkets(rawRows: TrendingMarketRow[]): RankedMarketsResult {
  const combined = dedupeByTrendingId(rawRows)
  if (combined.length === 0) {
    return { ranked: [], scoreById: new Map() }
  }

  const strictRows = dedupeExactQuestion(combined)
  const looseScored = scoreAndSort(combined)
  const strictScored = scoreAndSort(strictRows)

  const strictTop = strictScored.slice(0, TOP_RANKED_MARKETS)
  const strictCap = Math.min(TOP_RANKED_MARKETS, strictScored.length)
  const useLooseList =
    strictScored.length < MIN_RANKED_STRICT ||
    (combined.length >= MIN_MARKETS_DISPLAY && strictCap < MIN_MARKETS_DISPLAY)

  let chosen: Scored[]
  if (!useLooseList) {
    chosen = strictTop
  } else {
    const take = Math.min(
      TOP_RANKED_MARKETS,
      combined.length,
      combined.length >= MIN_MARKETS_DISPLAY
        ? Math.max(MIN_MARKETS_DISPLAY, TOP_RANKED_MARKETS)
        : combined.length
    )
    chosen = looseScored.slice(0, take)
  }

  const scoreById = new Map<string, number>()
  for (const { row, score } of chosen) {
    scoreById.set(row.id, score)
  }

  return {
    ranked: chosen.map((c) => c.row),
    scoreById,
  }
}
