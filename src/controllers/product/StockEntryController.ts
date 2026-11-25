import { Request, Response } from "express";
import { StockEntryService } from "../../services/product/StockEntryService";

class StockEntryController {
  async handle(request: Request, response: Response) {
    const stockEntryService = new StockEntryService();
    const entry = await stockEntryService.execute(request.body ?? {});

    return response.json(entry);
  }
}

export { StockEntryController };
