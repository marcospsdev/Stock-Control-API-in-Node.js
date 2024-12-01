import prismaClient from "../../prisma";
import { CategoryRequest } from "../../models/interfaces/category/CategoryRequest";

class CreateCategoryService {
  async execute({ name }: CategoryRequest) {
    if (name === "" || name === null || !name) {
      throw new Error("Invalid name");
    }

    const category = await prismaClient.category.create({
      data: {
        name: name,
      },
      select: {
        id: true,
        name: true,
      },
    });
    return category;
  }
}

export { CreateCategoryService };
