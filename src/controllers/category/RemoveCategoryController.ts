import { Request, Response } from "express";
import { RemoveCategoryService } from "../../services/category/RemoveCategoryService";

class RemoveCategoryController {
  async handle(request: Request, response: Response) {
    const { category_id } = request.params;

    const removeCategoryService = new RemoveCategoryService();
    const category = await removeCategoryService.execute({ category_id });

    return response.json({ message: "Category deleted successfully!" });
  }
}

export { RemoveCategoryController };
