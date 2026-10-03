import { z } from "zod";

/**
 * THE list contract. Every list endpoint responds:
 * { success: true, data: [...], pagination: { page, limit, total, totalPages } }
 * Defaults: page 1, 10 items. No exceptions.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function paginatedResponse<T>(data: T[], page: number, limit: number, total: number): Paginated<T> {
  return { data, meta: buildPagination(page, limit, total) };
}
