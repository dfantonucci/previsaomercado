import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MarketCardProps {
  question: string
  category: string
  yesPercentage: number
  source: "Polymarket" | "Kalshi"
  trend: "up" | "down" | "stable"
  trendValue?: string
  volumeUsd: number
}

const categoryColors: Record<string, string> = {
  Geopolítica: "bg-chart-3/10 text-chart-3",
  Eleições: "bg-chart-2/10 text-chart-2",
  Cripto: "bg-chart-1/10 text-chart-1",
  Tecnologia: "bg-chart-5/10 text-chart-5",
  Finanças: "bg-chart-4/10 text-chart-4",
  Cultura:
    "bg-orange-500/10 text-orange-800 dark:text-orange-300",
}

function formatVolumeUsd(value: number): string {
  // Formatação determinística para evitar “hydration mismatch” entre SSR e browser.
  // Não usamos `Intl` com `notation: "compact"` porque a implementação pode variar
  // (ex.: às vezes mostra “42 mi” vs “42,0 mi”).
  const v = Number.isFinite(value) ? value : 0
  const abs = Math.abs(v)
  const sign = v < 0 ? "-" : ""

  let scaled = v
  let suffix = ""
  if (abs >= 1_000_000_000) {
    scaled = v / 1_000_000_000
    suffix = "bi"
  } else if (abs >= 1_000_000) {
    scaled = v / 1_000_000
    suffix = "mi"
  } else if (abs >= 1_000) {
    scaled = v / 1_000
    suffix = "mil"
  } else {
    scaled = v
    suffix = ""
  }

  const rounded = suffix === "" ? Math.round(scaled) : Math.round(scaled * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9

  const num =
    suffix === ""
      ? Math.round(rounded).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
      : isInt
      ? Math.round(rounded).toLocaleString("pt-BR", {
          maximumFractionDigits: 0,
        })
      : rounded.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })

  return suffix ? `${sign}US$ ${num} ${suffix}` : `${sign}US$ ${num}`
}

export function MarketCard({
  question,
  category,
  yesPercentage,
  source,
  trend,
  trendValue,
  volumeUsd,
}: MarketCardProps) {
  const noPercentage = 100 - yesPercentage

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/50 hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            categoryColors[category] || "bg-muted text-muted-foreground"
          )}
        >
          {category}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {trend === "up" && (
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
          )}
          {trend === "down" && (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          {trend === "stable" && (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {trendValue && <span>{trendValue}</span>}
        </div>
      </div>

      <h3 className="mb-4 text-base font-medium leading-snug text-foreground">
        {question}
      </h3>

      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-accent">Sim</span>
          <span className="font-semibold text-foreground">{yesPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${yesPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Não</span>
          <span className="font-semibold text-foreground">{noPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/30 transition-all"
            style={{ width: `${noPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Volume (USD)</span>
          <span className="font-semibold text-foreground">
            {formatVolumeUsd(volumeUsd)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Odds implícitas: {(100 / yesPercentage).toFixed(2)}x</span>
          <span className="font-medium">{source}</span>
        </div>
      </div>
    </div>
  )
}
