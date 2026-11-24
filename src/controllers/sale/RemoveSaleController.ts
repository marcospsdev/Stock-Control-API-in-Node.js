import { Request, Response } from "express";
import { RemoveSaleService } from "../../services/sale/RemoveSaleService";

class RemoveSaleController {
  async handle(request: Request, response: Response) {
    const sale_id = request.params.sale_id as string;
    const removeSaleService = new RemoveSaleService();
    const sale = await removeSaleService.execute(sale_id);

    return response.json(sale);
  }
}

export { RemoveSaleController };
