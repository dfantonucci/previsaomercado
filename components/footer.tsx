import Link from "next/link"
import { TrendingUp } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Previsão Mercado
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Agregando as melhores previsões globais para ajudar você a entender
              o que pode acontecer no mundo.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Navegação
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="#mercados"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mercados
                </Link>
              </li>
              <li>
                <Link
                  href="#como-funciona"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link
                  href="#newsletter"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Fontes de Dados
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://polymarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Polymarket
                </a>
              </li>
              <li>
                <a
                  href="https://kalshi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Kalshi
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contato@previsaomercado.com"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Previsão Mercado. Todos os direitos
            reservados.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Aviso: Este site apenas agrega informações públicas de mercados de
            previsão. Não constitui recomendação de investimento.
          </p>
        </div>
      </div>
    </footer>
  )
}
