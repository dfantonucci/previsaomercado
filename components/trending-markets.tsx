"use client"

import { useState } from "react"
import { MarketCard, type MarketCardProps } from "@/components/market-card"
import { cn } from "@/lib/utils"
import type { TrendingMarketRow } from "@/lib/market-types"

const categories = [
  { id: "all", label: "Todos" },
  { id: "geopolitica", label: "Geopolítica" },
  { id: "eleicoes", label: "Eleições" },
  { id: "cripto", label: "Cripto" },
  { id: "tecnologia", label: "Tecnologia" },
  { id: "financas", label: "Finanças" },
  { id: "cultura", label: "Cultura" },
]

type TrendingMarketsProps = {
  buckets: Record<string, TrendingMarketRow[]>
}

export function TrendingMarkets({ buckets }: TrendingMarketsProps) {
  const [activeCategory, setActiveCategory] = useState("all")

  const filteredMarkets: (MarketCardProps & {
    id: string
    categoryId: string
    volumeUsd: number
  })[] = buckets[activeCategory === "all" ? "all" : activeCategory] ?? []

  return (
    <section id="mercados" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Mercados em Alta
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            As previsões mais acompanhadas pelos investidores globais
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={`${activeCategory}-${market.id}`}
              question={market.question}
              category={market.category}
              yesPercentage={market.yesPercentage}
              source={market.source}
              trend={market.trend}
              trendValue={market.trendValue}
              volumeUsd={market.volumeUsd}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
