import { Request, Response } from "express";
import { DetailProductService } from "../../services/product/DetailProductService";

class DetailProductController {
  async handle(request: Request, response: Response) {
    const { product_id } = request.params;

    const detailProductService = new DetailProductService();
    const product = await detailProductService.execute({ product_id });

    return response.json(product);
  }
}

export { DetailProductController };
