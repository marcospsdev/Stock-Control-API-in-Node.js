import prismaClient from "../../prisma";
import { BEDROCK_EMBEDDING_DIMENSIONS, BEDROCK_EMBEDDING_MODEL_ID, getBedrockClient } from "../../ai/bedrockClient";
import { EmbeddingClient, bytesToVector, cosineSimilarity, embedText } from "../../ai/embeddings";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MIN_SCORE = 0.2;
const QUERY_CACHE_SIZE = 100;

const queryCache = new Map<string, Float32Array>();

class SemanticSearchService {
  constructor(private readonly client: EmbeddingClient = getBedrockClient()) {}

  private async queryVector(query: string) {
    const key = query.toLowerCase();
    const cached = queryCache.get(key);
    if (cached) return { vector: cached, cached: true };

    const { vector } = await embedText(query, this.client);
    queryCache.set(key, vector);
    if (queryCache.size > QUERY_CACHE_SIZE) {
      queryCache.delete(queryCache.keys().next().value as string);
    }
    return { vector, cached: false };
  }

  async execute(rawQuery: unknown, rawLimit?: unknown) {
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
      throw new Error(`The search must have between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`);
    }
    const limit = Math.min(Math.max(Number(rawLimit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [embeddings, total] = await Promise.all([
      prismaClient.productEmbedding.findMany({
        where: { model: BEDROCK_EMBEDDING_MODEL_ID, dimensions: BEDROCK_EMBEDDING_DIMENSIONS },
        include: { product: { include: { category: { select: { id: true, name: true } } } } },
      }),
      prismaClient.product.count(),
    ]);
    if (embeddings.length === 0) {
      throw new Error("The smart search index is empty. Reindex the products first.");
    }

    const { vector, cached } = await this.queryVector(query);

    const results = embeddings
      .map((embedding) => ({ ...embedding.product, score: Math.round(cosineSimilarity(vector, bytesToVector(embedding.vector)) * 1000) / 1000 }))
      .filter((product) => product.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      query,
      results,
      indexed: embeddings.length,
      total,
      cached,
      model: BEDROCK_EMBEDDING_MODEL_ID,
    };
  }
}

export { SemanticSearchService };
