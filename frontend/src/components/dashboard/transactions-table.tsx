import { Link } from 'react-router-dom';
import { ArrowUpRight, ReceiptText } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PaymentTransaction } from '@/types';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export function TransactionsTable({
  items,
  basePath,
  compact = false,
}: {
  items: PaymentTransaction[];
  basePath: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No transactions yet"
        description="Payments will appear here as soon as a customer checks out."
        action={
          <Link
            to="/pay"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 hover:underline"
          >
            Open the payment page
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Reference</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          {!compact ? <TableHead>Channel</TableHead> : null}
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((transaction) => (
          <TableRow key={transaction.id} className="group">
            <TableCell>
              <Link
                to={`${basePath}/${encodeURIComponent(transaction.reference)}`}
                className="font-mono text-[11.5px] font-medium text-navy-900 hover:text-brand-600"
              >
                {transaction.reference}
              </Link>
            </TableCell>
            <TableCell className="max-w-[220px]">
              <p className="truncate text-[12.5px] font-medium text-navy-800">
                {transaction.customerEmail}
              </p>
              {transaction.customerName ? (
                <p className="truncate text-[11px] text-muted">{transaction.customerName}</p>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap text-[12.5px] font-semibold text-navy-900">
              {formatCurrency(transaction.amount, transaction.currency)}
            </TableCell>
            <TableCell>
              <StatusBadge status={transaction.status} />
            </TableCell>
            {!compact ? (
              <TableCell className="text-[12px] capitalize text-slate-600">
                {transaction.channel ?? '—'}
              </TableCell>
            ) : null}
            <TableCell className="whitespace-nowrap text-right text-[11.5px] text-muted">
              <span className="inline-flex items-center gap-1">
                {formatDateShort(transaction.createdAt)}
                <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
