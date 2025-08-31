import prismaClient from "../../prisma";

class ListUsersService {
  async execute() {
    const users = await prismaClient.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        user_type_id: true,
      },
    });

    return users;
  }
}

export { ListUsersService };
