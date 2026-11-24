import prismaClient from "../../prisma";
import { SaleProductRequest } from "../../models/interfaces/sale/SaleProductRequest";

class SaleProductService {
  async execute({ product_id, amount }: SaleProductRequest) {
    if (!product_id || !amount) {
      throw new Error("Input data was not passed correctly!");
    }

    const queryProduct = await prismaClient.product.findFirst({
      where: {
        id: product_id,
      },
    });

    if (queryProduct?.amount > amount && amount > 0) {
      const newAmount = queryProduct?.amount - amount;
      const unitPrice = Number(String(queryProduct.price).replace(",", ".")) || 0;
      const [saveSale, sale] = await prismaClient.$transaction([
        prismaClient.product.update({
          where: {
            id: product_id,
          },
          data: {
            amount: newAmount,
          },
          select: {
            id: true,
            name: true,
            amount: true,
          },
        }),
        prismaClient.sale.create({
          data: {
            product_id,
            product_name: queryProduct.name,
            unit_price: queryProduct.price,
            amount,
            total: Math.round(unitPrice * amount * 100) / 100,
          },
        }),
      ]);
      return { ...saveSale, sale };
    } else {
      throw new Error("The sale could not be completed!");
    }
  }
}

export { SaleProductService };
