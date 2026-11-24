import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createHash } from "crypto";
import { BEDROCK_EMBEDDING_DIMENSIONS, BEDROCK_EMBEDDING_MODEL_ID, getBedrockClient } from "./bedrockClient";
import { friendlyBedrockError } from "./bedrockErrors";

export type EmbeddingClient = Pick<BedrockRuntimeClient, "send">;

export interface ProductTextSource {
  name: string;
  description: string;
  category?: { name: string } | null;
}

export function productText(product: ProductTextSource) {
  return [product.name, product.category?.name ? `Categoria: ${product.category.name}` : "", product.description]
    .filter(Boolean)
    .join(". ")
    .slice(0, 2000);
}

export function textHash(text: string) {
  return createHash("sha256").update(`${BEDROCK_EMBEDDING_MODEL_ID}:${BEDROCK_EMBEDDING_DIMENSIONS}:${text}`).digest("hex");
}

export async function embedText(text: string, client: EmbeddingClient = getBedrockClient()) {
  let response;
  try {
    response = await client.send(
      new InvokeModelCommand({
        modelId: BEDROCK_EMBEDDING_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({ inputText: text, dimensions: BEDROCK_EMBEDDING_DIMENSIONS, normalize: true }),
      }),
    );
  } catch (error) {
    throw new Error(friendlyBedrockError(error));
  }

  const payload = JSON.parse(new TextDecoder().decode(response.body)) as { embedding?: number[]; inputTextTokenCount?: number };
  if (!Array.isArray(payload.embedding) || payload.embedding.length === 0) {
    throw new Error("AI request failed: the embedding model returned an empty vector.");
  }
  return { vector: Float32Array.from(payload.embedding), tokens: payload.inputTextTokenCount ?? 0 };
}

export function vectorToBytes(vector: Float32Array) {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

export function bytesToVector(bytes: Uint8Array) {
  const copy = Uint8Array.from(bytes);
  return new Float32Array(copy.buffer, 0, copy.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
