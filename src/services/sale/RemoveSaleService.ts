import prismaClient from "../../prisma";

class RemoveSaleService {
  async execute(sale_id: string) {
    if (!sale_id) {
      throw new Error("Sale ID was not sent!");
    }

    const sale = await prismaClient.sale.findUnique({ where: { id: sale_id } });

    if (!sale) {
      throw new Error("Sale not found!");
    }

    return prismaClient.sale.delete({ where: { id: sale_id } });
  }
}

export { RemoveSaleService };
