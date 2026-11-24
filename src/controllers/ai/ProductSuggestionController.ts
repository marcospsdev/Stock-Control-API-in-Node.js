import { Request, Response } from "express";
import { ProductSuggestionService } from "../../services/ai/ProductSuggestionService";

class ProductSuggestionController {
  async handle(request: Request, response: Response) {
    const productSuggestionService = new ProductSuggestionService();
    const suggestion = await productSuggestionService.execute({
      buffer: request.file?.buffer,
      mimetype: request.file?.mimetype,
      hint: request.body?.hint,
    });

    return response.json(suggestion);
  }
}

export { ProductSuggestionController };
