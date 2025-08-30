import { Request, Response } from "express";
import { EditProductService } from "../../services/product/EditProductService";
import { EditProductRequest } from "../../models/interfaces/product/EditProductRequest";

class EditProductController {
  async handle(request: Request, response: Response) {
    const { product_id } = request.params;
    const { amount, description, name, price }: EditProductRequest =
      request.body;
    const banner = request.file?.filename as string;

    const editProductService = new EditProductService();

    const productEdited = await editProductService.execute({
      product_id,
      amount,
      banner,
      description,
      name,
      price,
    });
    return response.json(productEdited);
  }
}

export { EditProductController };
