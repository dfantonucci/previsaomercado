import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { url, key }
}

/** Cliente Supabase (anon) para browser/server onde as env estão definidas. */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const cfg = getEnv()
  if (!cfg) return null
  return createClient(cfg.url, cfg.key)
}

function isDuplicateInsertError(error: { code?: string; message?: string }): boolean {
  if (error.code === "23505") return true
  const m = (error.message ?? "").toLowerCase()
  return m.includes("duplicate") || m.includes("unique")
}

/**
 * Persiste email na tabela `leads`.
 * - Valida formato antes de inserir.
 * - Duplicados: ignora sem lançar (nem log de erro).
 * - Outros erros: apenas `console.error`.
 */
export async function saveLead(email: string): Promise<void> {
  console.log("[LEAD] Received:", email)

  const normalizedEmail = String(email ?? "").trim().toLowerCase()
  console.log("[LEAD] Normalized:", normalizedEmail)

  const isValidEmail = EMAIL_RE.test(normalizedEmail)
  if (!isValidEmail) {
    console.warn("[LEAD] Invalid email:", normalizedEmail)
    return
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[LEAD] Missing Supabase env variables")
    return
  }

  const cfg = getEnv()
  if (!cfg) return

  console.log("[LEAD] Inserting into Supabase:", normalizedEmail)

  const supabase = createClient(cfg.url, cfg.key)
  const { error } = await supabase.from("leads").insert({
    email: normalizedEmail,
  })

  if (error) {
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      console.warn("[LEAD] Duplicate email:", normalizedEmail)
      return
    }

    console.error("[LEAD] Insert error:", {
      message: error.message,
      code: error.code,
      details: (error as any).details,
    })
    return
  }

  console.log("[LEAD] Successfully saved:", normalizedEmail)
}
