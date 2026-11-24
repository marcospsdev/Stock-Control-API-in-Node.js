import { BedrockRuntimeClient, ConverseCommand, ImageFormat } from "@aws-sdk/client-bedrock-runtime";
import prismaClient from "../../prisma";
import { BEDROCK_REGION, BEDROCK_VISION_MODEL_ID, getBedrockClient } from "../../ai/bedrockClient";
import { friendlyBedrockError } from "../../ai/bedrockErrors";

interface ProductSuggestionRequest {
  buffer?: Buffer;
  mimetype?: string;
  hint?: string;
}

interface SuggestionInput {
  name?: unknown;
  description?: unknown;
  category_id?: unknown;
  new_category_name?: unknown;
}

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 3.75 * 1024 * 1024;
const MAX_HINT_LENGTH = 300;
const NO_CATEGORY = "none";
const TOOL_NAME = "suggest_product";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

class ProductSuggestionService {
  constructor(private readonly client: Pick<BedrockRuntimeClient, "send"> = getBedrockClient()) {}

  async execute({ buffer, mimetype, hint }: ProductSuggestionRequest) {
    if (!buffer || !mimetype) {
      throw new Error("Send the product image in the 'file' field.");
    }
    const format = IMAGE_FORMATS[mimetype.toLowerCase()];
    if (!format) {
      throw new Error("Unsupported image format. Send a JPG, PNG, WEBP or GIF image.");
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error("Image too large. Send an image up to 3.75 MB.");
    }

    const categories = await prismaClient.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const categoryList = categories.map((category) => `- ${category.id}: ${category.name}`).join("\n");
    const userHint = text(hint, MAX_HINT_LENGTH);

    const prompt = `Você cadastra produtos em um sistema de estoque de uma loja de eletrônicos.
Analise a foto do produto e sugira os dados do cadastro em português do Brasil:
- name: nome comercial curto (até 60 caracteres), com marca e modelo quando estiverem visíveis. Não invente marca ou modelo que não dá para ver.
- description: 1 ou 2 frases objetivas (até 300 caracteres) com o que dá para afirmar pela foto.
- category_id: o id de UMA das categorias abaixo que melhor descreve o produto, ou "${NO_CATEGORY}" se nenhuma servir.
- new_category_name: preencha só quando category_id for "${NO_CATEGORY}", com o nome de uma categoria nova adequada.
Não sugira preço nem quantidade.

Categorias cadastradas (id: nome):
${categoryList || "(nenhuma)"}${userHint ? `\n\nInformação extra do usuário: ${userHint}` : ""}`;

    let response;
    try {
      response = await this.client.send(
        new ConverseCommand({
          modelId: BEDROCK_VISION_MODEL_ID,
          messages: [
            {
              role: "user",
              content: [{ image: { format, source: { bytes: buffer } } }, { text: prompt }],
            },
          ],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: TOOL_NAME,
                  description: "Registra a sugestão de cadastro do produto da foto.",
                  inputSchema: {
                    json: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        category_id: { type: "string", enum: [...categories.map((category) => category.id), NO_CATEGORY] },
                        new_category_name: { type: "string" },
                      },
                      required: ["name", "description", "category_id"],
                    },
                  },
                },
              },
            ],
            toolChoice: { tool: { name: TOOL_NAME } },
          },
          inferenceConfig: { maxTokens: 500, temperature: 0.2 },
        }),
      );
    } catch (error) {
      throw new Error(friendlyBedrockError(error));
    }

    const toolUse = response.output?.message?.content?.find((block) => block.toolUse?.name === TOOL_NAME)?.toolUse;
    if (!toolUse) {
      throw new Error("AI request failed: the model did not return a product suggestion.");
    }

    const input = (toolUse.input ?? {}) as SuggestionInput;
    const category = categories.find((item) => item.id === input.category_id) ?? null;
    const name = text(input.name, 80);
    if (!name) {
      throw new Error("AI request failed: the model could not identify the product in the image.");
    }

    return {
      name,
      description: text(input.description, 500),
      category_id: category?.id ?? null,
      category_name: category?.name ?? null,
      new_category_name: category ? null : text(input.new_category_name, 60) || null,
      model: BEDROCK_VISION_MODEL_ID,
      region: BEDROCK_REGION,
      usage: {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
      },
    };
  }
}

export { ProductSuggestionService };
