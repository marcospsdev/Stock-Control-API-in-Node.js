import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import prismaClient from "../../prisma";
import { BEDROCK_MODEL_ID, BEDROCK_REGION, getBedrockClient } from "../../ai/bedrockClient";
import { friendlyBedrockError } from "../../ai/bedrockErrors";
import { RestockForecastService } from "../sale/RestockForecastService";

const TOOL_NAME = "report_insights";
const MAX_RESTOCK_ITEMS = 15;

const texts = (value: unknown, max: number, maxLength: number) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, maxLength))
        .slice(0, max)
    : [];

class SalesInsightsService {
  constructor(
    private readonly client: Pick<BedrockRuntimeClient, "send"> = getBedrockClient(),
    private readonly forecastService = new RestockForecastService(),
  ) {}

  async execute(days = 30) {
    const forecast = await this.forecastService.execute(days);
    const since = new Date(forecast.since);

    const [topProducts, salesByProduct] = await Promise.all([
      prismaClient.sale.groupBy({
        by: ["product_name"],
        where: { created_at: { gte: since } },
        _sum: { amount: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      prismaClient.sale.findMany({
        where: { created_at: { gte: since } },
        select: { total: true, product: { select: { category: { select: { name: true } } } } },
      }),
    ]);

    const revenueByCategory = new Map<string, number>();
    for (const sale of salesByProduct) {
      const category = sale.product?.category?.name ?? "Produto removido";
      revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + sale.total);
    }

    const data = {
      periodo_dias: forecast.periodDays,
      cobertura_desejada_dias: forecast.coverageDays,
      periodo_atual: forecast.current,
      periodo_anterior: forecast.previous,
      variacao_faturamento_pct:
        forecast.previous.revenue > 0
          ? Math.round(((forecast.current.revenue - forecast.previous.revenue) / forecast.previous.revenue) * 1000) / 10
          : null,
      variacao_unidades_pct:
        forecast.previous.units > 0
          ? Math.round(((forecast.current.units - forecast.previous.units) / forecast.previous.units) * 1000) / 10
          : null,
      mais_vendidos_por_faturamento: topProducts.map((item) => ({
        produto: item.product_name,
        unidades: item._sum.amount ?? 0,
        faturamento: Math.round((item._sum.total ?? 0) * 100) / 100,
      })),
      faturamento_por_categoria: [...revenueByCategory.entries()]
        .map(([categoria, faturamento]) => ({ categoria, faturamento: Math.round(faturamento * 100) / 100 }))
        .sort((a, b) => b.faturamento - a.faturamento),
      reposicao: {
        sem_estoque: forecast.counts.out,
        criticos_ate_7_dias: forecast.counts.critical,
        baixos: forecast.counts.low,
        prioridades: forecast.items.slice(0, MAX_RESTOCK_ITEMS).map((item) => ({
          produto: item.name,
          status: item.status,
          estoque: item.stock,
          vendidos_no_periodo: item.unitsSold,
          dias_restantes: item.daysLeft,
          repor_unidades: item.suggestedRestock,
        })),
      },
    };

    const prompt = `Você é analista de vendas e estoque de uma loja de eletrônicos.
Abaixo estão dados JÁ CALCULADOS pelo sistema (valores em reais). Não refaça contas e não invente números: use apenas os valores fornecidos.
Escreva em português do Brasil, de forma direta, para o gerente da loja:
- headline: uma frase resumindo o período, usando variacao_faturamento_pct para comparar com o período anterior (se for null, não compare).
- insights: de 3 a 5 observações curtas sobre vendas, categorias e estoque.
- actions: de 1 a 3 ações recomendadas, priorizando a reposição dos itens sem estoque ou críticos e citando as quantidades de repor_unidades.

Dados:
${JSON.stringify(data)}`;

    let response;
    try {
      response = await this.client.send(
        new ConverseCommand({
          modelId: BEDROCK_MODEL_ID,
          messages: [{ role: "user", content: [{ text: prompt }] }],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: TOOL_NAME,
                  description: "Registra a análise de vendas e estoque.",
                  inputSchema: {
                    json: {
                      type: "object",
                      properties: {
                        headline: { type: "string" },
                        insights: { type: "array", items: { type: "string" } },
                        actions: { type: "array", items: { type: "string" } },
                      },
                      required: ["headline", "insights", "actions"],
                    },
                  },
                },
              },
            ],
            toolChoice: { tool: { name: TOOL_NAME } },
          },
          inferenceConfig: { maxTokens: 700, temperature: 0.3 },
        }),
      );
    } catch (error) {
      throw new Error(friendlyBedrockError(error));
    }

    const toolUse = response.output?.message?.content?.find((block) => block.toolUse?.name === TOOL_NAME)?.toolUse;
    const input = (toolUse?.input ?? {}) as { headline?: unknown; insights?: unknown; actions?: unknown };
    const headline = typeof input.headline === "string" ? input.headline.trim().slice(0, 300) : "";
    if (!headline) {
      throw new Error("AI request failed: the model did not return the sales analysis.");
    }

    return {
      periodDays: forecast.periodDays,
      headline,
      insights: texts(input.insights, 5, 300),
      actions: texts(input.actions, 3, 300),
      generatedAt: new Date().toISOString(),
      model: BEDROCK_MODEL_ID,
      region: BEDROCK_REGION,
      usage: {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
      },
    };
  }
}

export { SalesInsightsService };
