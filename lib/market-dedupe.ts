import type { Market } from "@/lib/market-types"

/** Distância ao equilíbrio 50/50 (0 = perfeitamente equilibrado). */
function probabilityExtremeness(m: Market): number {
  return Math.abs(m.yesProbability - 50)
}

/**
 * Escolhe um mercado representativo entre dois do mesmo grupo (ex.: mesmo evento Kalshi).
 * 1) maior volumeUsd
 * 2) probabilidades mais equilibradas (menos extremas)
 * 3) id (estável)
 */
export function pickBetterMarketRepresentative(a: Market, b: Market): Market {
  const volEps = 1e-6
  if (b.volumeUsd - a.volumeUsd > volEps) return b
  if (a.volumeUsd - b.volumeUsd > volEps) return a
  const exA = probabilityExtremeness(a)
  const exB = probabilityExtremeness(b)
  if (exB !== exA) return exB < exA ? b : a
  return a.id <= b.id ? a : b
}

/**
 * Um mercado por `eventGroupKey` (quando definido); caso contrário `id` permanece único.
 */
export function dedupeMarketsByEventGroup(markets: Market[]): Market[] {
  const map = new Map<string, Market>()
  for (const m of markets) {
    const gk =
      m.eventGroupKey != null && m.eventGroupKey.trim().length > 0
        ? m.eventGroupKey.trim()
        : m.id
    const prev = map.get(gk)
    if (!prev) {
      map.set(gk, m)
      continue
    }
    map.set(gk, pickBetterMarketRepresentative(prev, m))
  }
  return Array.from(map.values())
}
