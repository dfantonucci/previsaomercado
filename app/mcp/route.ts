import { NextResponse } from "next/server"
import { getTrendingMarkets } from "@/lib/markets"
import type { TrendingMarketRow } from "@/lib/market-types"

const PROTOCOL_VERSION = "2025-06-18"
const SERVER_INFO = {
  name: "previsao-mercado",
  version: "1.0.0",
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "Todas",
  geopolitica: "Geopolítica",
  eleicoes: "Eleições",
  cripto: "Cripto",
  tecnologia: "Tecnologia",
  financas: "Finanças",
  cultura: "Cultura",
}

const tools = [
  {
    name: "listar_categorias",
    description: "Lista as categorias de apostas disponíveis no Previsão Mercado.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_apostas",
    description:
      "Lista as apostas (mercados) disponíveis, opcionalmente filtradas por categoria. Use o id retornado para consultar detalhes.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          enum: Object.keys(CATEGORY_LABELS),
          description: "ID da categoria, como eleicoes, geopolitica ou cripto.",
        },
        limite: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "Quantidade de apostas a retornar. Padrão: 12.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "detalhar_aposta",
    description:
      "Retorna os detalhes de uma aposta específica, incluindo probabilidades, volume, tendência e fonte.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID exato retornado por listar_apostas." },
        busca: {
          type: "string",
          description: "Texto da pergunta da aposta, caso o id não esteja disponível.",
        },
      },
      additionalProperties: false,
    },
  },
] as const

function jsonRpc(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result }
}

function errorResponse(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  }
}

function formatMarket(row: TrendingMarketRow) {
  return {
    id: row.id,
    pergunta: row.question,
    categoria: row.category,
    categoriaId: row.categoryId,
    probabilidadeSim: row.yesPercentage,
    probabilidadeNao: 100 - row.yesPercentage,
    tendencia: row.trend,
    variacao24h: row.trendValue ?? "0%",
    volumeUsd: row.volumeUsd,
    fonte: row.source,
  }
}

async function getMarkets(): Promise<TrendingMarketRow[]> {
  const payload = await getTrendingMarkets()
  return Object.values(payload.buckets).flat().filter((row, index, all) =>
    all.findIndex((candidate) => candidate.id === row.id) === index
  )
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "listar_categorias") {
    const markets = await getMarkets()
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            Object.entries(CATEGORY_LABELS).map(([id, nome]) => ({
              id,
              nome,
              quantidadeApostas: id === "all" ? markets.length : markets.filter((m) => m.categoryId === id).length,
            })),
            null,
            2
          ),
        },
      ],
    }
  }

  const markets = await getMarkets()

  if (name === "listar_apostas") {
    const category = typeof args.categoria === "string" ? args.categoria : "all"
    if (!(category in CATEGORY_LABELS)) throw new Error("Categoria inválida.")
    const limit = typeof args.limite === "number" ? Math.min(12, Math.max(1, Math.floor(args.limite))) : 12
    const filtered = category === "all" ? markets : markets.filter((market) => market.categoryId === category)
    return {
      content: [{ type: "text", text: JSON.stringify(filtered.slice(0, limit).map(formatMarket), null, 2) }],
    }
  }

  if (name === "detalhar_aposta") {
    const id = typeof args.id === "string" ? args.id : ""
    const busca = typeof args.busca === "string" ? args.busca.trim().toLowerCase() : ""
    const market = markets.find((candidate) => candidate.id === id) ??
      (busca ? markets.find((candidate) => candidate.question.toLowerCase().includes(busca)) : undefined)
    if (!market) throw new Error("Aposta não encontrada. Use listar_apostas para consultar os IDs disponíveis.")
    return { content: [{ type: "text", text: JSON.stringify(formatMarket(market), null, 2) }] }
  }

  throw new Error(`Ferramenta desconhecida: ${name}`)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocol: "MCP via JSON-RPC 2.0",
      endpoint: "/mcp",
      tools: tools.map((tool) => tool.name),
    },
    { headers: corsHeaders() }
  )
}

export async function POST(request: Request) {
  const headers = { ...corsHeaders(), "Content-Type": "application/json" }
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(errorResponse(null, -32700, "JSON inválido."), { status: 400, headers })
  }

  const id = (typeof body.id === "string" || typeof body.id === "number" ? body.id : null)
  const method = body.method

  if (method === "notifications/initialized") return new NextResponse(null, { status: 202, headers })
  if (method === "ping") return NextResponse.json(jsonRpc(id, {}), { headers })
  if (method === "initialize") {
    return NextResponse.json(
      jsonRpc(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: "Consulte primeiro listar_categorias ou listar_apostas; use detalhar_aposta para aprofundar.",
      }),
      { headers }
    )
  }
  if (method === "tools/list") return NextResponse.json(jsonRpc(id, { tools }), { headers })
  if (method === "tools/call") {
    const params = (body.params ?? {}) as Record<string, unknown>
    const name = typeof params.name === "string" ? params.name : ""
    const args = (params.arguments ?? {}) as Record<string, unknown>
    try {
      return NextResponse.json(jsonRpc(id, await callTool(name, args)), { headers })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível executar a ferramenta."
      return NextResponse.json(jsonRpc(id, { isError: true, content: [{ type: "text", text: message }] }), { headers })
    }
  }

  return NextResponse.json(errorResponse(id, -32601, "Método não suportado."), { status: 404, headers })
}
