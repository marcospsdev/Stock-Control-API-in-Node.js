import prismaClient from "../../prisma";

interface RemoveProductRequest {
  product_id: string;
}

class RemoveProductService {
  async execute({ product_id }: RemoveProductRequest) {
    if (!product_id) {
      throw new Error("Product ID was not sent!");
    }

    const removeProduct = await prismaClient.product.delete({
      where: {
        id: product_id,
      },
    });
    return removeProduct;
  }
}

export { RemoveProductService };
