import { Request, Response } from "express";
import { ListProductsService } from "../../services/product/ListProductsService";
import { parsePagination, queryText } from "../../utils/pagination";

class ListProductsController {
  async handle(request: Request, response: Response) {
    const listProductsService = new ListProductsService();
    const products = await listProductsService.execute(parsePagination(request.query), {
      search: queryText(request.query.search),
      category_id: queryText(request.query.category_id),
    });

    return response.json(products);
  }
}

export { ListProductsController };
