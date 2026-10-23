import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileWarning,
  Loader2,
  Printer,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { usePageTitle } from '@/hooks/use-page-title';
import { paymentsService } from '@/services/payments.service';
import { ApiError } from '@/lib/api';
import { cn, formatDate, formatNgn } from '@/lib/utils';
import type { PublicPayment, TransactionStatus } from '@/types';

type ResultConfig = {
  title: string;
  description: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
  icon: ReactNode;
  pageTitle: string;
};

const configs: Record<TransactionStatus, ResultConfig> = {
  SUCCESS: {
    title: 'Payment successful',
    description: 'Your payment has been verified with Paystack and confirmed.',
    tone: 'success',
    icon: <Check className="size-8" />,
    pageTitle: 'Payment successful',
  },
  FAILED: {
    title: 'Payment failed',
    description: 'This payment was not completed. You can try again with a new transaction.',
    tone: 'danger',
    icon: <XCircle className="size-8" />,
    pageTitle: 'Payment failed',
  },
  ABANDONED: {
    title: 'Payment abandoned',
    description: 'The checkout was closed before the payment was completed.',
    tone: 'neutral',
    icon: <Ban className="size-8" />,
    pageTitle: 'Payment abandoned',
  },
  REVERSED: {
    title: 'Payment reversed',
    description: 'This payment was refunded or reversed after being completed.',
    tone: 'warning',
    icon: <RotateCcw className="size-8" />,
    pageTitle: 'Payment reversed',
  },
  PENDING: {
    title: 'Payment pending',
    description: 'Paystack has not confirmed this payment yet. It may still be processing.',
    tone: 'warning',
    icon: <Clock3 className="size-8" />,
    pageTitle: 'Payment pending',
  },
  INITIALIZED: {
    title: 'Payment not completed',
    description: 'This payment was initialized but has not been completed.',
    tone: 'warning',
    icon: <Clock3 className="size-8" />,
    pageTitle: 'Payment not completed',
  },
};

const tones = {
  success: {
    ring: 'bg-emerald-50',
    icon: 'bg-emerald-600 text-white',
    text: 'text-emerald-700',
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  danger: {
    ring: 'bg-red-50',
    icon: 'bg-red-600 text-white',
    text: 'text-red-700',
    badge: 'border-red-100 bg-red-50 text-red-700',
  },
  warning: {
    ring: 'bg-amber-50',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-700',
    badge: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  neutral: {
    ring: 'bg-slate-100',
    icon: 'bg-slate-500 text-white',
    text: 'text-slate-700',
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
  },
};

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="text-right text-[12px] font-medium text-navy-900">{children}</span>
    </div>
  );
}

export default function PaymentResultPage() {
  const { reference = '' } = useParams();
  const query = useQuery({
    queryKey: ['payment', 'public', reference],
    queryFn: () => paymentsService.getPublic(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  const payment: PublicPayment | undefined = query.data;
  const config = payment ? configs[payment.status] ?? configs.PENDING : configs.PENDING;
  usePageTitle(config.pageTitle);

  const notFound = query.error instanceof ApiError && query.error.status === 404;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="no-print border-b border-border bg-white">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <ShieldCheck className="size-3.5 text-accent-600" />
            Verified with Paystack
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-lg">
          {query.isLoading ? (
            <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="mt-4 h-48 w-full rounded-xl" />
              </div>
            </div>
          ) : notFound || !payment ? (
            <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FileWarning className="size-6" />
              </span>
              <h1 className="mt-4 text-[20px] font-bold text-navy-900">Payment not found</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                We could not find a transaction with that reference. Check the link or search for your
                payment using its reference.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild>
                  <Link to="/pay">
                    Make a payment
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/payment/verify">Find a payment</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_60px_rgba(16,24,40,0.08)]">
              <div className="px-6 pb-2 pt-8 text-center sm:px-8">
                <div className={cn('relative mx-auto flex size-20 items-center justify-center rounded-full', tones[config.tone].ring)}>
                  <span
                    className={cn(
                      'flex size-14 items-center justify-center rounded-full shadow-lg',
                      tones[config.tone].icon,
                    )}
                  >
                    {config.icon}
                  </span>
                </div>
                <h1 className="mt-5 text-[23px] font-bold tracking-[-0.03em] text-navy-900">{config.title}</h1>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
                  {config.description}
                </p>
                <p className="mt-4 text-[34px] font-bold tracking-[-0.04em] text-navy-900">
                  {formatNgn(payment.amount / 100)}
                </p>
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em]',
                    tones[config.tone].badge,
                  )}
                >
                  {payment.status}
                </span>
                {payment.status === 'FAILED' && payment.failureReason ? (
                  <p className="mx-auto mt-3 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-[11.5px] text-red-700">
                    {payment.failureReason}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 border-y border-border bg-canvas/60 px-6 py-2 sm:px-8">
                <ReceiptRow label="Reference">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                    {payment.reference}
                    <CopyButton value={payment.reference} label="Reference copied" />
                  </span>
                </ReceiptRow>
                <ReceiptRow label="Customer">{payment.customerEmail}</ReceiptRow>
                <ReceiptRow label="Date">{formatDate(payment.paidAt ?? payment.createdAt)}</ReceiptRow>
                <ReceiptRow label="Channel">
                  {payment.channel ? payment.channel.charAt(0).toUpperCase() + payment.channel.slice(1) : '—'}
                </ReceiptRow>
                <ReceiptRow label="Currency">{payment.currency}</ReceiptRow>
              </div>

              <div className="no-print space-y-2 px-6 py-6 sm:px-8">
                {payment.status === 'SUCCESS' ? (
                  <>
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <p className="text-[11.5px] leading-relaxed text-emerald-900/80">
                        A confirmation has been recorded against this reference. Keep this receipt for your
                        records.
                      </p>
                    </div>
                    <Button asChild className="w-full" size="lg">
                      <Link to="/pay">
                        Make another payment
                        <ArrowRight />
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => window.print()}>
                      <Printer />
                      Print receipt
                    </Button>
                  </>
                ) : payment.status === 'PENDING' || payment.status === 'INITIALIZED' ? (
                  <>
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/payment/processing?reference=${encodeURIComponent(payment.reference)}`}>
                        <Loader2 className={query.isFetching ? 'animate-spin' : ''} />
                        Check status again
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/pay">
                        <ArrowLeft />
                        Back to checkout
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full" size="lg">
                      <Link to="/pay">
                        Try another payment
                        <ArrowRight />
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => window.print()}>
                      <Printer />
                      Save this page
                    </Button>
                  </>
                )}
                <p className="flex items-center justify-center gap-1.5 pt-1 text-[10.5px] text-slate-400">
                  <Copy className="size-3" />
                  Reference {payment.reference}
                </p>
              </div>
            </div>
          )}

          <p className="no-print mt-6 text-center text-[11.5px] text-muted">
            Need help?{' '}
            <Link to="/" className="font-medium text-brand-600 hover:underline">
              Return home
            </Link>{' '}
            or search by reference from the <Link to="/payment/verify" className="underline">payment lookup</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

export { PaymentResultPage };
