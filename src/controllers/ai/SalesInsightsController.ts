import { Request, Response } from "express";
import { SalesInsightsService } from "../../services/ai/SalesInsightsService";

class SalesInsightsController {
  async handle(request: Request, response: Response) {
    const salesInsightsService = new SalesInsightsService();
    const insights = await salesInsightsService.execute(Number(request.body?.days) || 30);

    return response.json(insights);
  }
}

export { SalesInsightsController };
