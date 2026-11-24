import { Request, Response } from "express";
import { ListUsersService } from "../../services/user/ListUsersService";
import { parsePagination, queryText } from "../../utils/pagination";

class ListUsersController {
  async handle(request: Request, response: Response) {
    const listUsersService = new ListUsersService();
    const users = await listUsersService.execute(
      parsePagination(request.query),
      queryText(request.query.search),
    );

    return response.json(users);
  }
}

export { ListUsersController };
