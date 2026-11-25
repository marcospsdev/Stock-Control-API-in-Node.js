import { BedrockRuntimeClient, ContentBlock, ConverseCommand, ImageFormat } from "@aws-sdk/client-bedrock-runtime";
import prismaClient from "../../prisma";
import { BEDROCK_REGION, BEDROCK_VISION_MODEL_ID, getBedrockClient } from "../../ai/bedrockClient";
import { friendlyBedrockError } from "../../ai/bedrockErrors";

interface InvoiceExtractionRequest {
  buffer?: Buffer;
  mimetype?: string;
}

interface RawItem {
  description?: unknown;
  quantity?: unknown;
  unit_price?: unknown;
  product_id?: unknown;
}

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 4.5 * 1024 * 1024;
const MAX_ITEMS = 100;
const NO_PRODUCT = "none";
const TOOL_NAME = "register_invoice";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const positiveNumber = (value: unknown) => {
  const parsed =
    typeof value === "string"
      ? Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value)
      : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

class InvoiceExtractionService {
  constructor(private readonly client: Pick<BedrockRuntimeClient, "send"> = getBedrockClient()) {}

  async execute({ buffer, mimetype }: InvoiceExtractionRequest) {
    if (!buffer || !mimetype) {
      throw new Error("Send the invoice in the 'file' field.");
    }
    const isPdf = mimetype.toLowerCase() === "application/pdf";
    const imageFormat = IMAGE_FORMATS[mimetype.toLowerCase()];
    if (!isPdf && !imageFormat) {
      throw new Error("Unsupported invoice format. Send a PDF, JPG, PNG or WEBP file.");
    }
    if (buffer.length > MAX_BYTES) {
      throw new Error("Invoice file too large. Send a file up to 4.5 MB.");
    }

    const products = await prismaClient.product.findMany({
      select: { id: true, name: true, amount: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    const catalog = products.map((product) => `- ${product.id}: ${product.name} (${product.category?.name ?? "sem categoria"})`).join("\n");

    const prompt = `Você lê notas fiscais e pedidos de fornecedores de uma loja de eletrônicos.
Extraia do documento:
- supplier: nome do fornecedor/emitente (vazio se não aparecer).
- invoice_number: número da nota ou do pedido (vazio se não aparecer).
- issue_date: data de emissão no formato AAAA-MM-DD (vazio se não aparecer).
- items: um item por linha de produto da nota, com:
  - description: descrição do produto como está escrita na nota.
  - quantity: quantidade (número).
  - unit_price: valor unitário em reais (número), se aparecer.
  - product_id: o id do produto do catálogo abaixo que é o MESMO produto da linha, ou "${NO_PRODUCT}" se não houver correspondência clara. Não force correspondência por categoria parecida.
Ignore fretes, impostos, descontos e totais. Não invente itens nem valores.

Catálogo de produtos (id: nome (categoria)):
${catalog || "(vazio)"}`;

    const fileBlock: ContentBlock = isPdf
      ? { document: { format: "pdf", name: "nota fiscal", source: { bytes: buffer } } }
      : { image: { format: imageFormat, source: { bytes: buffer } } };

    let response;
    try {
      response = await this.client.send(
        new ConverseCommand({
          modelId: BEDROCK_VISION_MODEL_ID,
          messages: [{ role: "user", content: [fileBlock, { text: prompt }] }],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: TOOL_NAME,
                  description: "Registra os dados extraídos da nota fiscal.",
                  inputSchema: {
                    json: {
                      type: "object",
                      properties: {
                        supplier: { type: "string" },
                        invoice_number: { type: "string" },
                        issue_date: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              description: { type: "string" },
                              quantity: { type: "number" },
                              unit_price: { type: "number" },
                              product_id: { type: "string", enum: [...products.map((product) => product.id), NO_PRODUCT] },
                            },
                            required: ["description", "quantity", "product_id"],
                          },
                        },
                      },
                      required: ["items"],
                    },
                  },
                },
              },
            ],
            toolChoice: { tool: { name: TOOL_NAME } },
          },
          inferenceConfig: { maxTokens: 3000, temperature: 0 },
        }),
      );
    } catch (error) {
      throw new Error(friendlyBedrockError(error));
    }

    const toolUse = response.output?.message?.content?.find((block) => block.toolUse?.name === TOOL_NAME)?.toolUse;
    const input = (toolUse?.input ?? {}) as { supplier?: unknown; invoice_number?: unknown; issue_date?: unknown; items?: unknown };
    const rawItems = Array.isArray(input.items) ? (input.items as RawItem[]) : [];

    const items = rawItems
      .slice(0, MAX_ITEMS)
      .map((item) => {
        const quantity = positiveNumber(item.quantity);
        const product = products.find((candidate) => candidate.id === item.product_id) ?? null;
        const unitPrice = positiveNumber(item.unit_price);
        return {
          description: text(item.description, 200),
          quantity: quantity ? Math.max(1, Math.round(quantity)) : null,
          unit_price: unitPrice ? Math.round(unitPrice * 100) / 100 : null,
          product_id: product?.id ?? null,
          product_name: product?.name ?? null,
          current_stock: product?.amount ?? null,
        };
      })
      .filter((item) => item.description || item.product_id);

    if (items.length === 0) {
      throw new Error("AI request failed: no products were found in the invoice.");
    }

    const issueDate = text(input.issue_date, 10);
    return {
      supplier: text(input.supplier, 120) || null,
      invoice_number: text(input.invoice_number, 60) || null,
      issue_date: /^\d{4}-\d{2}-\d{2}$/.test(issueDate) ? issueDate : null,
      items,
      matched: items.filter((item) => item.product_id).length,
      model: BEDROCK_VISION_MODEL_ID,
      region: BEDROCK_REGION,
      usage: {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
      },
    };
  }
}

export { InvoiceExtractionService };
