import { Request, Response } from "express";
import { SemanticSearchService } from "../../services/ai/SemanticSearchService";
import { ProductEmbeddingService } from "../../services/ai/ProductEmbeddingService";

class SemanticSearchController {
  async search(request: Request, response: Response) {
    const semanticSearchService = new SemanticSearchService();
    const result = await semanticSearchService.execute(request.query.q, request.query.limit);

    return response.json(result);
  }

  async status(request: Request, response: Response) {
    const productEmbeddingService = new ProductEmbeddingService();

    return response.json(await productEmbeddingService.status());
  }

  async reindex(request: Request, response: Response) {
    const productEmbeddingService = new ProductEmbeddingService();
    const result = await productEmbeddingService.reindexAll(request.body?.force === true);

    return response.json(result);
  }
}

export { SemanticSearchController };
