import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { Pagination, paginated } from "../../utils/pagination";

const DEFAULT_PAGINATION: Pagination = { page: 1, limit: 10, skip: 0 };

class ListSalesService {
  async execute(pagination: Pagination | null, search = "") {
    const page = pagination ?? DEFAULT_PAGINATION;
    const where: Prisma.SaleWhereInput = search ? { product_name: { contains: search } } : {};

    const [sales, total, summary] = await prismaClient.$transaction([
      prismaClient.sale.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              banner: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: page.skip,
        take: page.limit,
      }),
      prismaClient.sale.count({ where }),
      prismaClient.sale.aggregate({
        where,
        _sum: { total: true, amount: true },
      }),
    ]);

    return {
      ...paginated(sales, total, page),
      totalRevenue: summary._sum.total ?? 0,
      totalUnits: summary._sum.amount ?? 0,
    };
  }
}

export { ListSalesService };
