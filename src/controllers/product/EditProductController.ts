import { Request, Response } from "express";
import { EditProductService } from "../../services/product/EditProductService";
import { EditProductRequest } from "../../models/interfaces/product/EditProductRequest";

class EditProductController {
  async handle(request: Request, response: Response) {
    const {
      amount,
      banner,
      description,
      name,
      price,
      product_id,
    }: EditProductRequest = request.body;
    const editProductService = new EditProductService();

    const productEdited = editProductService.execute({
      amount,
      banner,
      description,
      name,
      price,
      product_id,
    });
    return response.json(productEdited);
  }
}

export { EditProductController };
