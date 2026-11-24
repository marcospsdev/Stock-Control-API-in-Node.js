import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { Pagination, paginated } from "../../utils/pagination";

const select = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

class ListCategoryService {
  async execute(pagination: Pagination | null = null, search = "") {
    if (!pagination) {
      return prismaClient.category.findMany({ select });
    }

    const where: Prisma.CategoryWhereInput = search ? { name: { contains: search } } : {};

    const [categories, total] = await prismaClient.$transaction([
      prismaClient.category.findMany({
        where,
        select,
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prismaClient.category.count({ where }),
    ]);

    return paginated(categories, total, pagination);
  }
}

export { ListCategoryService };
