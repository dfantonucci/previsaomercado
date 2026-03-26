"use server"

import { subscribeToBeehiiv } from "@/lib/beehiiv"
import { saveLead } from "@/lib/supabase"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function subscribeNewsletter(email: string) {
  const raw = String(email ?? "").trim()
  console.log("[NEWSLETTER] submit attempt:", raw)
  if (!emailRe.test(raw)) {
    console.warn("[NEWSLETTER] invalid email:", raw)
    return { ok: false as const }
  }
  try {
    await Promise.allSettled([saveLead(raw), subscribeToBeehiiv(raw)])
    console.log("[NEWSLETTER] done:", raw)
    return { ok: true as const }
  } catch (err) {
    console.error("[NEWSLETTER] action failed:", {
      message: err instanceof Error ? err.message : String(err),
    })
    return { ok: false as const }
  }
}
