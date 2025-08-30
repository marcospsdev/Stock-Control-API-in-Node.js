import { Request, Response } from "express";
import { EditUserService } from "../../services/user/EditUserService";

class EditUserController {
  async handle(request: Request, response: Response) {
    const { user_id } = request.params;
    const { name, email } = request.body;

    const editUserService = new EditUserService();
    const editedUser = await editUserService.execute({
      user_id,
      name,
      email,
    });

    return response.json(editedUser);
  }
}

export { EditUserController };
