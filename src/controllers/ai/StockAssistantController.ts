import { Request, Response } from "express";
import { StockAssistantService } from "../../services/ai/StockAssistantService";

class StockAssistantController {
  async handle(request: Request, response: Response) {
    const stockAssistantService = new StockAssistantService();
    const answer = await stockAssistantService.execute(request.body?.messages);

    return response.json(answer);
  }
}

export { StockAssistantController };
