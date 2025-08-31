import { Request, Response } from "express";
import { CreateUserService } from "../../services/user/CreateUserService";
import { UserRequest } from "../../models/interfaces/user/UserRequest";

interface CreateUserRequest extends UserRequest {
  user_type_id: string;
}

class CreateUserController {
  async handle(request: Request, response: Response) {
    const { name, email, password, user_type_id }: CreateUserRequest =
      request.body;
    const createUserService = new CreateUserService();
    const user = await createUserService.execute({
      name,
      email,
      password,
      user_type_id,
    });

    return response.json(user);
  }
}

export { CreateUserController };
