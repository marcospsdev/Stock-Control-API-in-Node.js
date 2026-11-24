import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { Pagination, paginated } from "../../utils/pagination";

const select = {
  id: true,
  name: true,
  email: true,
  user_type_id: true,
} satisfies Prisma.UserSelect;

class ListUsersService {
  async execute(pagination: Pagination | null = null, search = "") {
    if (!pagination) {
      return prismaClient.user.findMany({ select });
    }

    const where: Prisma.UserWhereInput = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const [users, total, groups] = await Promise.all([
      prismaClient.user.findMany({
        where,
        select,
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prismaClient.user.count({ where }),
      prismaClient.user.groupBy({
        by: ["user_type_id"],
        _count: { _all: true },
      }),
    ]);

    const countsByType = Object.fromEntries(
      groups.map((group) => [group.user_type_id, group._count._all]),
    );

    return { ...paginated(users, total, pagination), countsByType };
  }
}

export { ListUsersService };
