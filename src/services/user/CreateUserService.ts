import prismaClient from "../../prisma";
import { hash } from "bcryptjs";
import { UserRequest } from "../../models/interfaces/user/UserRequest";

class CreateUserService {
  async execute({ name, email, password, user_type_id }: UserRequest) {
    if (!email) {
      throw new Error("Email incorrect");
    }

    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new Error("Email already exists");
    }

    // Encrypting the user password
    const passwordHash = await hash(password, 8);

    // Creating the user
    const user = prismaClient.user.create({
      data: {
        name: name,
        email: email,
        password: passwordHash,
        user_type_id: user_type_id, // Agora salvamos o user_type_id no banco de dados
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_type_id: true, // Retornamos o user_type_id na resposta
      },
    });

    return user;
  }
}

export { CreateUserService };
