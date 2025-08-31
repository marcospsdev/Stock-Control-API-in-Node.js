import prismaClient from "../../prisma";

interface EditUserRequest {
  user_id: string;
  name?: string;
  email?: string;
  user_type_id?: string;
}

interface UpdatedUserResponse {
  id: string;
  name: string;
  email: string;
  user_type_id: string;
}

class EditUserService {
  async execute({
    user_id,
    name,
    email,
    user_type_id,
  }: EditUserRequest): Promise<UpdatedUserResponse> {
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

    return prismaClient.user.update({
      where: {
        id: user_id,
      },
      data: {
        name: name || user.name,
        email: email || user.email,
        user_type_id: user_type_id || user.user_type_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_type_id: true,
      },
    });
  }
}

export { EditUserService };
