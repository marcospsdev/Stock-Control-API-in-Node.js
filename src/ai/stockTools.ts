import { Prisma } from "@prisma/client";
import { Tool } from "@aws-sdk/client-bedrock-runtime";
import prismaClient from "../prisma";

type ToolInput = Record<string, unknown>;
type ToolHandler = (input: ToolInput) => Promise<Record<string, unknown>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ROWS = 50;

const toNumber = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
};

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const priceOf = (price: string) => Number(String(price).replace(",", ".")) || 0;

const productRow = (product: {
  id: string;
  name: string;
  price: string;
  amount: number;
  category: { name: string } | null;
}) => ({
  id: product.id,
  name: product.name,
  price: priceOf(product.price),
  amount: product.amount,
  category: product.category?.name ?? null,
});

const listProducts: ToolHandler = async (input) => {
  const search = toText(input.search);
  const category = toText(input.category);
  const maxAmount = input.max_amount === undefined ? undefined : toNumber(input.max_amount, 0, 1_000_000);
  const limit = toNumber(input.limit, 20, MAX_ROWS);

  const where: Prisma.ProductWhereInput = {
    ...(search && { name: { contains: search } }),
    ...(category && { category: { name: { contains: category } } }),
    ...(maxAmount !== undefined && { amount: { lte: maxAmount } }),
  };

  const [products, total] = await Promise.all([
    prismaClient.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: maxAmount !== undefined ? { amount: "asc" } : { name: "asc" },
      take: limit,
    }),
    prismaClient.product.count({ where }),
  ]);

  return { total, returned: products.length, products: products.map(productRow) };
};

const stockOverview: ToolHandler = async (input) => {
  const lowStockThreshold = toNumber(input.low_stock_threshold, 5, 1000);
  const products = await prismaClient.product.findMany({
    include: { category: { select: { name: true } } },
  });

  const byCategory = new Map<string, { products: number; units: number; stockValue: number }>();
  for (const product of products) {
    const key = product.category?.name ?? "Sem categoria";
    const entry = byCategory.get(key) ?? { products: 0, units: 0, stockValue: 0 };
    entry.products += 1;
    entry.units += product.amount;
    entry.stockValue += product.amount * priceOf(product.price);
    byCategory.set(key, entry);
  }

  return {
    totalProducts: products.length,
    totalUnits: products.reduce((sum, product) => sum + product.amount, 0),
    totalStockValue: Math.round(products.reduce((sum, product) => sum + product.amount * priceOf(product.price), 0) * 100) / 100,
    lowStockThreshold,
    lowStockCount: products.filter((product) => product.amount <= lowStockThreshold).length,
    outOfStockCount: products.filter((product) => product.amount === 0).length,
    categories: [...byCategory.entries()].map(([name, entry]) => ({
      name,
      ...entry,
      stockValue: Math.round(entry.stockValue * 100) / 100,
    })),
  };
};

const salesSummary: ToolHandler = async (input) => {
  const days = toNumber(input.days, 30, 365) || 30;
  const productName = toText(input.product_name);
  const top = toNumber(input.top, 5, 20) || 5;
  const since = new Date(Date.now() - days * DAY_MS);

  const where: Prisma.SaleWhereInput = {
    created_at: { gte: since },
    ...(productName && { product_name: { contains: productName } }),
  };

  const [totals, grouped] = await Promise.all([
    prismaClient.sale.aggregate({ where, _count: true, _sum: { total: true, amount: true } }),
    prismaClient.sale.groupBy({
      by: ["product_name"],
      where,
      _sum: { amount: true, total: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: top,
    }),
  ]);

  return {
    periodDays: days,
    since: since.toISOString().slice(0, 10),
    salesCount: totals._count,
    unitsSold: totals._sum.amount ?? 0,
    revenue: Math.round((totals._sum.total ?? 0) * 100) / 100,
    topProducts: grouped.map((group) => ({
      product: group.product_name,
      unitsSold: group._sum.amount ?? 0,
      revenue: Math.round((group._sum.total ?? 0) * 100) / 100,
      sales: group._count,
    })),
  };
};

const listCategories: ToolHandler = async () => {
  const categories = await prismaClient.category.findMany({
    select: { name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return { categories: categories.map((category) => ({ name: category.name, products: category._count.products })) };
};

export const STOCK_TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "list_products",
      description:
        "Lista produtos do estoque com nome, preço (R$), quantidade e categoria. Use max_amount para achar produtos com estoque baixo ou zerado.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            search: { type: "string", description: "Parte do nome do produto." },
            category: { type: "string", description: "Parte do nome da categoria." },
            max_amount: { type: "number", description: "Retorna só produtos com quantidade menor ou igual a este valor." },
            limit: { type: "number", description: `Máximo de produtos retornados (até ${MAX_ROWS}).` },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "stock_overview",
      description:
        "Resumo geral do estoque: total de produtos, unidades, valor do estoque, quantos estão com estoque baixo ou zerado e totais por categoria.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            low_stock_threshold: { type: "number", description: "Quantidade a partir da qual o estoque é considerado baixo (padrão 5)." },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "sales_summary",
      description:
        "Resumo das vendas registradas em um período: quantidade de vendas, unidades vendidas, faturamento (R$) e produtos mais vendidos.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            days: { type: "number", description: "Últimos N dias (padrão 30, máximo 365)." },
            product_name: { type: "string", description: "Filtra por parte do nome do produto." },
            top: { type: "number", description: "Quantos produtos mais vendidos retornar (padrão 5)." },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "list_categories",
      description: "Lista as categorias com a quantidade de produtos em cada uma.",
      inputSchema: { json: { type: "object", properties: {} } },
    },
  },
];

const HANDLERS: Record<string, ToolHandler> = {
  list_products: listProducts,
  stock_overview: stockOverview,
  sales_summary: salesSummary,
  list_categories: listCategories,
};

export async function runStockTool(name: string, input: unknown) {
  const handler = HANDLERS[name];
  if (!handler) {
    return { error: `Ferramenta desconhecida: ${name}` };
  }
  return handler((input ?? {}) as ToolInput);
}
