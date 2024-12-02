import prismaClient from "../../prisma";
import { ProductRequest } from "../../models/interfaces/product/ProductRequest";

class CreateProductService {
  async execute({
    name,
    price,
    description,
    banner,
    category_id,
    amount,
  }: ProductRequest) {
    const product = await prismaClient.product.create({
      data: {
        name: name,
        price: price,
        description: description,
        banner: banner,
        category_id: category_id,
        amount: +amount,
      },
    });
    return product;
  }
}

export { CreateProductService };
