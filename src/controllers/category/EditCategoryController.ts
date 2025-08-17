import { Request, Response } from "express";
import { EditCategoryService } from "../../services/category/EditCategoryService";

class EditCategoryController {
  async handle(request: Request, response: Response) {
    const { name } = request.body;
    const { category_id } = request.params; // Correção aqui!

    const editCategoryService = new EditCategoryService();
    const categoryEdited = await editCategoryService.execute({
      name,
      category_id,
    });

    return response.json(categoryEdited);
  }
}

export { EditCategoryController };
