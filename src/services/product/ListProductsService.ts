import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { Pagination, paginated } from "../../utils/pagination";

interface ListProductsFilters {
  search?: string;
  category_id?: string;
}

class ListProductsService {
  async execute(pagination: Pagination | null = null, filters: ListProductsFilters = {}) {
    if (!pagination) {
      return prismaClient.product.findMany({
        select: {
          id: true,
          name: true,
          amount: true,
          category_id: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }

    const where: Prisma.ProductWhereInput = {
      ...(filters.search && { name: { contains: filters.search } }),
      ...(filters.category_id && { category_id: filters.category_id }),
    };

    const [products, total] = await prismaClient.$transaction([
      prismaClient.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prismaClient.product.count({ where }),
    ]);

    return paginated(products, total, pagination);
  }
}

export { ListProductsService };
