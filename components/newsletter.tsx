"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle, Users } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const emailFromForm = String(fd.get("email") ?? "").trim()
    const toSend = emailFromForm || email.trim()
    if (!toSend) return

    console.log("[NEWSLETTER] client submit:", toSend)
    try {
      const url = `${window.location.origin}/api/newsletter`
      console.log("[NEWSLETTER] calling API:", url)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: toSend }),
        credentials: "same-origin",
      })

      const result = (await res
        .json()
        .catch(() => ({ ok: false as const }))) as { ok: boolean }

      console.log("[NEWSLETTER] API result:", result)
    } catch (err) {
      console.error("[NEWSLETTER] API call threw:", err)
    }
    setIsSubmitted(true)
    setEmail("")
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  return (
    <section id="newsletter" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-8 sm:p-12 lg:p-16">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Receba o que realmente importa, todos os dias
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
              Um resumo diário com as previsões mais relevantes para investidores,
              empreendedores e analistas.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <Input
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-full border-0 bg-primary-foreground/10 px-5 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground"
                required
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-12 gap-2 rounded-full px-6"
                disabled={isSubmitted}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Inscrito!
                  </>
                ) : (
                  <>
                    Inscrever
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary-foreground/70">
              <Users className="h-4 w-4" />
              <span>+1.000 leitores já inscritos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
