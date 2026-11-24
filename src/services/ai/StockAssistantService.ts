import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  Message,
  ToolResultContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { BEDROCK_MODEL_ID, BEDROCK_REGION, getBedrockClient } from "../../ai/bedrockClient";
import { STOCK_TOOLS, runStockTool } from "../../ai/stockTools";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `Você é o assistente de um sistema de controle de estoque e vendas de uma loja de eletrônicos.
Responda sempre em português do Brasil, de forma curta e objetiva.
Use as ferramentas para consultar os dados reais antes de responder sobre produtos, estoque ou vendas. Nunca invente números.
Valores monetários estão em reais (R$). Hoje é ${new Date().toISOString().slice(0, 10)}.
Você só pode consultar dados; não registra vendas nem altera produtos. Se pedirem isso, explique que a ação deve ser feita pelas telas do sistema.
Se a pergunta não tiver relação com o estoque ou as vendas da loja, diga educadamente que só ajuda com esses assuntos.`;

const validateMessages = (messages: unknown): ChatMessage[] => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Send at least one message.");
  }
  const history = messages.slice(-MAX_HISTORY).map((message) => {
    const role = message?.role;
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    if ((role !== "user" && role !== "assistant") || !content) {
      throw new Error("Each message must have role 'user' or 'assistant' and a non-empty content.");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Messages can have at most ${MAX_MESSAGE_LENGTH} characters.`);
    }
    return { role, content } as ChatMessage;
  });
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") {
    throw new Error("The last message must be from the user.");
  }
  return history;
};

const friendlyBedrockError = (error: unknown) => {
  const name = (error as { name?: string })?.name ?? "";
  const message = (error as { message?: string })?.message ?? "";
  if (name === "CredentialsProviderError" || /credential/i.test(message)) {
    return "AI is not configured: AWS credentials were not found. Fill in .env.aws (see .env.aws.example).";
  }
  if (name === "ValidationException" && /operation not allowed/i.test(message)) {
    return "AI is unavailable: the Bedrock quotas for this AWS account are still 0 (Operation not allowed).";
  }
  if (name === "AccessDeniedException") {
    return "AI is unavailable: the AWS credentials do not have permission to invoke this Bedrock model.";
  }
  if (name === "ThrottlingException") {
    return "AI is busy: too many requests to Bedrock. Try again in a few seconds.";
  }
  return `AI request failed: ${name || "Error"}${message ? ` - ${message}` : ""}`;
};

class StockAssistantService {
  constructor(private readonly client: Pick<BedrockRuntimeClient, "send"> = getBedrockClient()) {}

  async execute(rawMessages: unknown) {
    const history = validateMessages(rawMessages);
    const messages: Message[] = history.map((message) => ({
      role: message.role,
      content: [{ text: message.content }],
    }));

    const usage = { inputTokens: 0, outputTokens: 0 };
    const toolsUsed: string[] = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await this.client.send(
          new ConverseCommand({
            modelId: BEDROCK_MODEL_ID,
            system: [{ text: SYSTEM_PROMPT }],
            messages,
            toolConfig: { tools: STOCK_TOOLS },
            inferenceConfig: { maxTokens: 700, temperature: 0.2 },
          }),
        );
      } catch (error) {
        throw new Error(friendlyBedrockError(error));
      }

      usage.inputTokens += response.usage?.inputTokens ?? 0;
      usage.outputTokens += response.usage?.outputTokens ?? 0;

      const output = response.output?.message;
      if (!output) throw new Error("AI request failed: empty response from Bedrock.");
      messages.push(output);

      if (response.stopReason !== "tool_use") {
        const reply = (output.content ?? [])
          .map((block) => block.text ?? "")
          .join("")
          .trim();
        return { reply, model: BEDROCK_MODEL_ID, region: BEDROCK_REGION, toolsUsed, usage };
      }

      const results: ContentBlock[] = [];
      for (const block of output.content ?? []) {
        if (!block.toolUse) continue;
        const { toolUseId, name, input } = block.toolUse;
        toolsUsed.push(name);
        let content: ToolResultContentBlock[];
        let status: "success" | "error" = "success";
        try {
          const result = (await runStockTool(name, input)) as ToolResultContentBlock.JsonMember["json"];
          content = [{ json: result }];
        } catch (error) {
          status = "error";
          content = [{ text: `Erro ao consultar ${name}: ${(error as Error).message}` }];
        }
        results.push({ toolResult: { toolUseId, content, status } });
      }
      messages.push({ role: "user", content: results });
    }

    throw new Error("AI request failed: too many tool calls in a single answer.");
  }
}

export { StockAssistantService };
