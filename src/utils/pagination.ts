import { Request } from "express";

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
};

export function parsePagination(query: Request["query"]): Pagination | null {
  if (query.page === undefined && query.limit === undefined) return null;

  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(MAX_LIMIT, toPositiveInt(query.limit, DEFAULT_LIMIT));

  return { page, limit, skip: (page - 1) * limit };
}

export function queryText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function paginated<T>(data: T[], total: number, { page, limit }: Pagination) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
