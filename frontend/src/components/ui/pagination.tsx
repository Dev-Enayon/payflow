import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import type { Pagination as PaginationMeta } from '@/types';

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted">
        Showing <span className="font-semibold text-navy-800">{from}</span>–
        <span className="font-semibold text-navy-800">{to}</span> of{' '}
        <span className="font-semibold text-navy-800">{pagination.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft />
          Previous
        </Button>
        <span className="px-1 text-xs text-muted">
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
