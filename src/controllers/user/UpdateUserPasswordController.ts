import { Request, Response } from "express";
import { UpdateUserPasswordService } from "../../services/user/UpdateUserPasswordService";

class UpdateUserPasswordController {
  async handle(request: Request, response: Response) {
    const { user_id } = request.params;
    const { password } = request.body;

    const updateUserPasswordService = new UpdateUserPasswordService();

    const user = await updateUserPasswordService.execute({ user_id, password });

    return response.json(user);
  }
}

export { UpdateUserPasswordController };
