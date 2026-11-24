import prismaClient from "../../prisma";
import { BEDROCK_EMBEDDING_DIMENSIONS, BEDROCK_EMBEDDING_MODEL_ID, getBedrockClient } from "../../ai/bedrockClient";
import { EmbeddingClient, embedText, productText, textHash, vectorToBytes } from "../../ai/embeddings";

class ProductEmbeddingService {
  constructor(private readonly client: EmbeddingClient = getBedrockClient()) {}

  async refreshProduct(product_id: string, force = false) {
    const product = await prismaClient.product.findUnique({
      where: { id: product_id },
      include: { category: { select: { name: true } }, embedding: { select: { text_hash: true } } },
    });
    if (!product) return "missing" as const;

    const text = productText(product);
    const hash = textHash(text);
    if (!force && product.embedding?.text_hash === hash) return "unchanged" as const;

    const { vector } = await embedText(text, this.client);
    const data = {
      model: BEDROCK_EMBEDDING_MODEL_ID,
      text_hash: hash,
      dimensions: vector.length,
      vector: vectorToBytes(vector),
    };
    await prismaClient.productEmbedding.upsert({
      where: { product_id },
      create: { product_id, ...data },
      update: data,
    });
    return "indexed" as const;
  }

  async reindexAll(force = false) {
    const products = await prismaClient.product.findMany({ select: { id: true }, orderBy: { name: "asc" } });
    const result = { total: products.length, indexed: 0, unchanged: 0 };
    for (const product of products) {
      const status = await this.refreshProduct(product.id, force);
      if (status === "indexed") result.indexed++;
      if (status === "unchanged") result.unchanged++;
    }
    return { ...result, status: await this.status() };
  }

  async status() {
    const [total, indexed] = await Promise.all([
      prismaClient.product.count(),
      prismaClient.productEmbedding.count({
        where: { model: BEDROCK_EMBEDDING_MODEL_ID, dimensions: BEDROCK_EMBEDDING_DIMENSIONS },
      }),
    ]);
    return { total, indexed, missing: Math.max(0, total - indexed), model: BEDROCK_EMBEDDING_MODEL_ID };
  }

  static refreshInBackground(product_id: string) {
    new ProductEmbeddingService().refreshProduct(product_id).catch((error: Error) => {
      console.warn(`[ai] Could not update the search index for product ${product_id}: ${error.message}`);
    });
  }
}

export { ProductEmbeddingService };
