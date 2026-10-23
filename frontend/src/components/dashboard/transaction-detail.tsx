import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { paymentsService } from '@/services/payments.service';
import { ApiError } from '@/lib/api';
import { cn, formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils';
import type { PaymentTransaction } from '@/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="max-w-[60%] break-words text-right text-[12.5px] font-medium text-navy-900">
        {children}
      </span>
    </div>
  );
}

export function TransactionDetail({
  reference,
  fetcher,
  backTo,
}: {
  reference: string;
  fetcher: (reference: string) => Promise<PaymentTransaction>;
  backTo: string;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['transaction', reference, backTo],
    queryFn: () => fetcher(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  const verify = useMutation({
    mutationFn: () => paymentsService.verify(reference),
    onSuccess: (result) => {
      const messages: Record<string, string> = {
        SUCCESS: 'Payment confirmed with Paystack.',
        FAILED: 'Paystack reports this payment as failed.',
        ABANDONED: 'Paystack reports this checkout was abandoned.',
        REVERSED: 'This payment has been reversed.',
        PENDING: 'Paystack has not confirmed this payment yet.',
        INITIALIZED: 'Payment has not been completed yet.',
      };
      toast.success(messages[result.status] ?? 'Verification complete.');
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not verify this payment with Paystack right now.',
      );
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (query.error || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Card>
        <EmptyState
          icon={FileWarning}
          title={notFound ? 'Transaction not found' : 'Could not load transaction'}
          description={
            notFound
              ? 'No transaction matches this reference in the workspace.'
              : query.error instanceof Error
                ? query.error.message
                : 'Please try again.'
          }
          action={
            <Button asChild variant="outline">
              <Link to={backTo}>
                <ArrowLeft />
                Back to transactions
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const transaction = query.data;
  const canVerify = !['SUCCESS', 'REVERSED'].includes(transaction.status);

  const timeline = [
    { label: 'Created', value: transaction.createdAt, icon: Clock3 },
    { label: 'Initialized with provider', value: transaction.initializedAt, icon: CreditCard },
    { label: 'Verified with Paystack', value: transaction.verifiedAt, icon: ShieldCheck },
    { label: 'Payment confirmed', value: transaction.paidAt, icon: Check },
  ];

  return (
    <div className="space-y-5">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-navy-900"
      >
        <ArrowLeft className="size-3.5" />
        Back to transactions
      </Link>

      <PageHeader
        title="Transaction details"
        description={`Reference ${transaction.reference}`}
        actions={
          <>
            <CopyButton
              value={transaction.reference}
              label="Reference copied"
              variant="outline"
              size="sm"
            />
            {canVerify ? (
              <Button size="sm" onClick={() => verify.mutate()} loading={verify.isPending}>
                <RefreshCw className={verify.isPending ? 'animate-spin' : ''} />
                Re-verify with Paystack
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-border bg-gradient-to-br from-white to-canvas/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Amount</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-[30px] font-bold tracking-[-0.04em] text-navy-900">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <StatusBadge status={transaction.status} />
            </div>
            <p className="mt-1 text-[11.5px] text-muted">
              {transaction.currency} · {transaction.provider} · Created {formatTimeAgo(transaction.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <UserRound className="size-4" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-navy-900">{transaction.customerEmail}</p>
              <p className="text-[11px] text-muted">{transaction.customerName ?? 'Customer'}</p>
            </div>
          </div>
        </div>
      </Card>

      {transaction.failureReason ? (
        <Alert tone="danger" title="Failure reason">
          {transaction.failureReason}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment information</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Customer email">{transaction.customerEmail}</Row>
              <Row label="Customer name">{transaction.customerName ?? '—'}</Row>
              <Row label="Channel">
                {transaction.channel ? (
                  <span className="capitalize">{transaction.channel}</span>
                ) : (
                  '—'
                )}
              </Row>
              <Row label="Provider">{transaction.provider}</Row>
              <Row label="Provider reference">
                <span className="font-mono text-[11px]">{transaction.providerReference ?? '—'}</span>
              </Row>
              <Row label="Gateway response">{transaction.gatewayResponse ?? '—'}</Row>
              <Row label="Paid at">{formatDate(transaction.paidAt)}</Row>
              <Row label="Last updated">{formatDate(transaction.updatedAt)}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-5 border-l border-border pl-6">
                {timeline.map((item) => {
                  const done = Boolean(item.value);
                  const failed =
                    transaction.status === 'FAILED' && item.label === 'Payment confirmed';
                  return (
                    <li key={item.label} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[31px] flex size-4 items-center justify-center rounded-full ring-4 ring-white',
                          failed
                            ? 'bg-red-100 text-red-600'
                            : done
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {failed ? <XCircle className="size-3" /> : <item.icon className="size-2.5" />}
                      </span>
                      <p className="text-[12.5px] font-medium text-navy-900">{item.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        {item.value ? formatDate(item.value) : 'Not reached'}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              {transaction.metadata && Object.keys(transaction.metadata).length > 0 ? (
                <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-slate-600">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-[12.5px] text-muted">No metadata was attached to this payment.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identifiers</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Transaction ID">
                <span className="font-mono text-[10.5px]">{transaction.id}</span>
              </Row>
              <Row label="Reference">
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px]">
                  {transaction.reference}
                  <CopyButton value={transaction.reference} label="Reference copied" />
                </span>
              </Row>
            </CardContent>
          </Card>

          <Alert tone="info" title="Need to reconcile?">
            Re-verifying asks Paystack for the current status. A successful or reversed payment is never
            downgraded by a later check.
          </Alert>
        </div>
      </div>
    </div>
  );
}
