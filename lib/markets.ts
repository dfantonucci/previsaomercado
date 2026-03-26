import { buildMarketBuckets } from "@/lib/market-buckets"
import type { MarketsUiPayload, TrendingMarketRow } from "@/lib/market-types"
import { fetchKalshiCandidateRows } from "@/lib/kalshi"
import { fetchPolymarketCandidateRows } from "@/lib/polymarket"
import { getFallbackTrendingRows } from "@/lib/mockData"
import { translateQuestionsToPortuguese } from "@/lib/translate"
import { dedupeSimilarMarkets } from "@/lib/market-similar-dedupe"

function isSportsMarketQuestion(question: string): boolean {
  const q = question.toLowerCase()

  // Ligas/torneios/termos muito característicos de esportes.
  if (
    /\b(nba|nfl|nhl|mlb|ufc|ncaaf|ncaab|atp|wta|f1)\b/.test(q) ||
    /\b(super bowl|world cup|fifa|uefa|premier league|la liga|serie a|champions league|eurovision|euro|olympic|olympics?)\b/.test(
      q
    )
  ) {
    return true
  }

  // “Mundo” de modalidades.
  if (
    /\b(basketball|football|soccer|baseball|hockey|rugby|cricket|tennis|golf)\b/.test(
      q
    )
  ) {
    return true
  }

  // Formatos típicos de apostas (ex.: spread / moneyline / over-under),
  // só consideramos se também houver contexto de jogo/equipe/score.
  const bettingMarkets =
    /\b(spread|over\s*\/?\s*under|o\s*\/\s*u|moneyline|total points|points)\b/.test(
      q
    )
  const hasGameContext = /\b(team|player|match|game|league|tournament|score|quarter)\b/.test(
    q
  )

  if (bettingMarkets && hasGameContext) return true

  // “vs” com contexto de jogo costuma ser esporte.
  if (/\bvs\.?\b/.test(q) && hasGameContext) return true

  return false
}

/** Traduz só perguntas que entram em algum bucket (top 12), não todo o universo da API. */
async function withPortugueseBuckets(
  candidatesEn: TrendingMarketRow[]
): Promise<MarketsUiPayload> {
  const bucketsDraft = buildMarketBuckets(candidatesEn)
  const neededIds = new Set<string>()
  for (const list of Object.values(bucketsDraft.buckets)) {
    for (const r of list) neededIds.add(r.id)
  }

  const enById = new Map(candidatesEn.map((c) => [c.id, c.question]))
  const uniqueEn = [
    ...new Set(
      [...neededIds]
        .map((id) => enById.get(id))
        .filter((q): q is string => Boolean(q))
    ),
  ]

  const translated = await translateQuestionsToPortuguese(uniqueEn)
  const enToPt = new Map(uniqueEn.map((en, i) => [en, translated[i]]))

  const candidatesPt = candidatesEn.map((c) => ({
    ...c,
    question: enToPt.get(c.question) ?? c.question,
  }))

  return buildMarketBuckets(candidatesPt)
}

export async function getTrendingMarkets(): Promise<MarketsUiPayload> {
  const [polyResult, kalshiResult] = await Promise.allSettled([
    fetchPolymarketCandidateRows(),
    fetchKalshiCandidateRows(),
  ])

  const polyRows =
    polyResult.status === "fulfilled" ? polyResult.value : []
  const kalshiRows =
    kalshiResult.status === "fulfilled" ? kalshiResult.value : []

  const candidatesEn: TrendingMarketRow[] = [...polyRows, ...kalshiRows]

  // Defesa extra: garantir que “sports” não chegue à UI.
  const candidatesFiltered = candidatesEn.filter(
    (r) => !isSportsMarketQuestion(r.question)
  )

  // Deduplica mercados “semelhantes” (especialmente macro como Fed/rates/inflação).
  const candidatesDeduped = dedupeSimilarMarkets(candidatesFiltered)

  if (candidatesDeduped.length === 0) {
    return buildMarketBuckets(getFallbackTrendingRows())
  }

  try {
    return await withPortugueseBuckets(candidatesDeduped)
  } catch {
    return buildMarketBuckets(getFallbackTrendingRows())
  }
}
