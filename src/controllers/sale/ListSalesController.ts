import { Request, Response } from "express";
import { ListSalesService } from "../../services/sale/ListSalesService";
import { parsePagination, queryText } from "../../utils/pagination";

class ListSalesController {
  async handle(request: Request, response: Response) {
    const listSalesService = new ListSalesService();
    const sales = await listSalesService.execute(
      parsePagination(request.query),
      queryText(request.query.search),
    );

    return response.json(sales);
  }
}

export { ListSalesController };
