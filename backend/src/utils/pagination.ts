import type { Request } from 'express';
import { z } from 'zod';
import { parseInput } from './validation';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export function getPagination(query: Request['query'], pageSizeDefault = 20): Pagination {
  const parsed = parseInput(
    paginationSchema.extend({
      pageSize: z.coerce.number().int().min(1).max(100).default(pageSizeDefault),
    }),
    query,
  );
  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    skip: (parsed.page - 1) * parsed.pageSize,
    take: parsed.pageSize,
  };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  pagination: Pick<Pagination, 'page' | 'pageSize'>,
) {
  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}
