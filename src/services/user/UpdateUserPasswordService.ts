import prismaClient from "../../prisma";
import { hash } from "bcryptjs";
import { UpdateUserPasswordRequest } from "../../models/interfaces/user/UpdateUserPasswordRequest";

class UpdateUserPasswordService {
  async execute({ user_id, password }: UpdateUserPasswordRequest) {
    if (!user_id || !password) {
      throw new Error("Invalid input data.");
    }

    const hashedPassword = await hash(password, 8);

    const user = await prismaClient.user.update({
      where: {
        id: user_id,
      },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_type_id: true,
      },
    });

    return user;
  }
}

export { UpdateUserPasswordService };
