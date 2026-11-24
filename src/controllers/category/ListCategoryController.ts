import { Request, Response } from "express";
import { ListCategoryService } from "../../services/category/ListCategoryService";
import { parsePagination, queryText } from "../../utils/pagination";

class ListCategoryController {
  async handle(request: Request, response: Response) {
    const listCategoryService = new ListCategoryService();
    const categories = await listCategoryService.execute(
      parsePagination(request.query),
      queryText(request.query.search),
    );

    return response.json(categories);
  }
}

export { ListCategoryController };
