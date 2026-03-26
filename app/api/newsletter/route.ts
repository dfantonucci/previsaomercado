import { NextResponse } from "next/server"
import { saveLead } from "@/lib/supabase"
import { subscribeToBeehiiv } from "@/lib/beehiiv"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Só para confirmar no terminal que a rota existe (abre no browser: GET /api/newsletter). */
export async function GET() {
  console.log("[NEWSLETTER API] GET health — route is mounted")
  return NextResponse.json({ ok: true, route: "newsletter" })
}

export async function POST(req: Request) {
  try {
    // Aceita tanto JSON quanto form submission (x-www-form-urlencoded / multipart/form-data).
    let email = ""
    const contentType = req.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { email?: string }
      email = String(body.email ?? "").trim()
    } else {
      const fd = await req.formData()
      email = String(fd.get("email") ?? "").trim()
    }

    console.log("[NEWSLETTER API] received:", email)

    if (!emailRe.test(email)) {
      console.warn("[NEWSLETTER API] invalid email:", email)
      return NextResponse.json({ ok: false as const }, { status: 400 })
    }

    await Promise.allSettled([saveLead(email), subscribeToBeehiiv(email)])
    console.log("[NEWSLETTER API] processed:", email)

    return NextResponse.json({ ok: true as const })
  } catch (err) {
    console.error("[NEWSLETTER API] failed:", {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ ok: false as const }, { status: 500 })
  }
}

