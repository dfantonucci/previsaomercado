import type { TrendingMarketRow } from "@/lib/market-types"

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function balanceScore(yesPercentage: number): number {
  // 1 = perfeito 50/50; 0 = extremo (0% ou 100%)
  const dist = Math.abs(yesPercentage - 50)
  return 1 - Math.min(1, dist / 50)
}

function isMacroQuestion(q: string): boolean {
  return /\b(fed|federal reserve|interest rate|rates|fomc|cpi|inflation|gdp|unemployment|treasury|bond|yield|recession|rate cut|rate hike|yield curve)\b/i.test(
    q
  )
}

function macroEventKey(categoryId: string, question: string): string | null {
  if (!isMacroQuestion(question)) return null

  const q = question.toLowerCase()

  // Caso específico: “upper bound of the federal funds rate ... following the Fed's ... meeting”
  // Normalmente aparece em várias variações (threshold e reunião), mas para a UI queremos
  // tratar como o mesmo “tópico macro”.
  if (/upper bound of the federal funds rate/.test(q)) {
    return `macro:${categoryId}:fed-upper-bound`
  }

  // Remove números e termos de “limiar” para agrupar mercados do mesmo evento,
  // mas com thresholds diferentes (ex.: Fed rates acima/abaixo de X%).
  let base = q
  base = base.replace(
    /\b(at least|at most|greater than|less than|above|below|over|under|>=|<=|>|<)\b/gi,
    " "
  )
  base = base.replace(/\b\d+(\.\d+)?%\b/g, " ")
  // Datas comuns tipo “Mar 17, 2027” e variações.
  base = base.replace(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b/gi,
    " "
  )
  // Anos e números soltos (mantemos palavras, removemos apenas os valores).
  base = base.replace(/\b20\d{2}\b/g, " ")
  base = base.replace(/\b\d+(\.\d+)?\b/g, " ")
  base = normalizeText(base)

  return `macro:${categoryId}|${base}`
}

function pickRepresentative(
  a: TrendingMarketRow,
  b: TrendingMarketRow
): TrendingMarketRow {
  // Preferir volume, depois probabilidades mais balanceadas.
  const maxV = Math.max(a.volumeUsd, b.volumeUsd, 1)
  const minV = Math.min(a.volumeUsd, b.volumeUsd)
  const similarVolume = minV / maxV >= 0.92 // quase empate

  if (!similarVolume) return b.volumeUsd > a.volumeUsd ? b : a

  const ba = balanceScore(a.yesPercentage)
  const bb = balanceScore(b.yesPercentage)
  if (bb !== ba) return bb > ba ? b : a

  return a.id <= b.id ? a : b
}

/**
 * Deduplica mercados “semelhantes”:
 * - Se for macro (Fed/rates/inflação etc), agrupa por “evento” (threshold removido) e mantém 1 representante.
 * - Para o resto, remove apenas duplicados exatos (normalizados).
 */
export function dedupeSimilarMarkets(
  rows: TrendingMarketRow[]
): TrendingMarketRow[] {
  const byKey = new Map<string, TrendingMarketRow>()

  for (const r of rows) {
    const macroKey = macroEventKey(r.categoryId, r.question)
    const key = macroKey ?? `exact:${r.categoryId}:${normalizeText(r.question)}`

    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, r)
      continue
    }

    byKey.set(key, pickRepresentative(prev, r))
  }

  return Array.from(byKey.values())
}

