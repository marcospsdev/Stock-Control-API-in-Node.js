import prismaClient from "../../prisma";
import { User } from "@prisma/client";

interface EditUserRequest {
  user_id: string;
  name: string;
  email: string;
}

class EditUserService {
  async execute({ user_id, name, email }: EditUserRequest): Promise<User> {
    if (!user_id) {
      throw new Error("User ID is required.");
    }

    const user = await prismaClient.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const updatedUser = await prismaClient.user.update({
      where: {
        id: user_id,
      },
      data: {
        name: name || user.name,
        email: email || user.email,
      },
    });

    return updatedUser;
  }
}

export { EditUserService };
