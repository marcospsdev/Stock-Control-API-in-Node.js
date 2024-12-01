import prismaClient from "../../prisma";
import { RemoveUserRequest } from "../../models/interfaces/user/RemoveUserRequest";
class RemoveUserService {
  async execute({ user_id }: RemoveUserRequest) {
    if (user_id) {
      const removeUser = await prismaClient.user.delete({
        where: {
          id: user_id,
        },
      });
      return removeUser;
    }
  }
}

export { RemoveUserService };
