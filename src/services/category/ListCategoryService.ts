import prismaClient from "../../prisma";

class ListCategoryService {
  async execute() {
    // Buscar todas as categorias do banco de dados
    const categories = await prismaClient.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    return categories;
  }
}

export { ListCategoryService };
