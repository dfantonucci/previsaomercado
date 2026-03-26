/** Limite conservador do query string da API pública. */
const MAX_QUERY_CHARS = 450

function isLikelyServiceMessage(s: string): boolean {
  return /MYMEMORY|QUOTA|LIMIT EXCEEDED|INVALID|ERROR/i.test(s)
}

/**
 * Tradução en→pt via MyMemory (sem API key). Falha → texto original.
 * `fetch` com revalidate reduz chamadas repetidas na mesma frase.
 */
export async function translateToPortuguese(text: string): Promise<string> {
  const q = text.trim()
  if (!q) return text

  const chunk = q.length > MAX_QUERY_CHARS ? q.slice(0, MAX_QUERY_CHARS) : q

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|pt`
    const res = await fetch(url, {
      next: { revalidate: 86_400 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return text

    const data = (await res.json()) as {
      responseData?: { translatedText?: string }
    }
    const t = data.responseData?.translatedText?.trim()
    if (!t || isLikelyServiceMessage(t)) return text
    return t
  } catch {
    return text
  }
}

export async function translateQuestionsToPortuguese(
  questions: string[]
): Promise<string[]> {
  return Promise.all(questions.map((q) => translateToPortuguese(q)))
}
