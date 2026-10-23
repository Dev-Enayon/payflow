import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Alert } from '@/components/ui/alert';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { TransactionsTable } from './transactions-table';
import type { Paginated, PaymentTransaction, TransactionStatus } from '@/types';
import type { PaymentListParams } from '@/services/payments.service';
import { formatCurrency } from '@/lib/utils';

const statuses: Array<{ value: TransactionStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INITIALIZED', label: 'Initialized' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'REVERSED', label: 'Reversed' },
];

function csvSafe(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return /^[=+\-@]/.test(escaped) ? `"'${escaped}"` : `"${escaped}"`;
}

function exportCsv(items: PaymentTransaction[]) {
  const header = ['Reference', 'Customer email', 'Amount (NGN)', 'Status', 'Channel', 'Created at'];
  const rows = items.map((item) => [
    item.reference,
    item.customerEmail,
    (item.amount / 100).toFixed(2),
    item.status,
    item.channel ?? '',
    item.createdAt,
  ]);
  const content = [header, ...rows]
    .map((row) => row.map((cell) => csvSafe(String(cell))).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `payflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success('Transactions exported');
}

export function TransactionsView({
  title,
  description,
  fetcher,
  basePath,
}: {
  title: string;
  description: string;
  fetcher: (params: PaymentListParams) => Promise<Paginated<PaymentTransaction>>;
  basePath: string;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debouncedSearch = useDebounce(search);

  const params: PaymentListParams = {
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'ALL' ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const query = useQuery({
    queryKey: ['transactions', basePath, params],
    queryFn: () => fetcher(params),
  });

  const hasFilters = Boolean(search || from || to || status !== 'ALL');

  function clearFilters() {
    setSearch('');
    setStatus('ALL');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(query.data?.data ?? [])}
            disabled={!query.data?.data.length}
          >
            <Download />
            Export page
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search reference, email or name"
              className="pl-10"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as TransactionStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            aria-label="To date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
          <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters} className="justify-start">
            <X />
            Clear
          </Button>
        </div>
      </Card>

      {query.error ? (
        <Alert tone="danger" title="Could not load transactions">
          {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <TableSkeleton />
        ) : query.data ? (
          <>
            <TransactionsTable items={query.data.data} basePath={basePath} />
            {query.data.pagination.total > 0 ? (
              <Pagination
                pagination={query.data.pagination}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : null}
          </>
        ) : null}
      </Card>

      {query.data && query.data.data.length > 0 ? (
        <p className="flex items-center justify-end gap-1.5 text-[11px] text-muted">
          <Filter className="size-3" />
          Showing {query.data.data.length} of {query.data.pagination.total} · Volume on this page{' '}
          {formatCurrency(
            query.data.data
              .filter((item) => item.status === 'SUCCESS')
              .reduce((sum, item) => sum + item.amount, 0),
          )}
        </p>
      ) : null}
    </div>
  );
}
