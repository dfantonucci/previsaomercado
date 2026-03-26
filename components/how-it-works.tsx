import { DollarSign, Users, Mail } from "lucide-react"

const steps = [
  {
    icon: DollarSign,
    title: "Mercados reais",
    description:
      "Pessoas apostam dinheiro real em previsões — quando arriscam capital, pensam com mais cuidado.",
  },
  {
    icon: Users,
    title: "Inteligência coletiva",
    description:
      "As probabilidades refletem a expectativa agregada de milhares de participantes do mercado.",
  },
  {
    icon: Mail,
    title: "Insights por email",
    description:
      "Receba diariamente os movimentos mais relevantes, sem precisar acompanhar tudo.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-y border-border bg-secondary/50 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Como Funciona
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            Entenda por que mercados de previsão são tão precisos
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
