import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Alert } from '@/components/ui/alert';
import { usePageTitle } from '@/hooks/use-page-title';
import { paymentsService } from '@/services/payments.service';
import { ApiError } from '@/lib/api';
import { formatNgn } from '@/lib/utils';
import type { TransactionStatus } from '@/types';

const terminalStatuses: TransactionStatus[] = ['SUCCESS', 'FAILED', 'ABANDONED', 'REVERSED'];

export default function PaymentProcessingPage() {
  usePageTitle('Verifying payment');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') ?? '';
  const [errorCount, setErrorCount] = useState(0);

  const query = useQuery({
    queryKey: ['payment', 'verify', reference],
    queryFn: () => paymentsService.verify(reference),
    enabled: Boolean(reference),
    retry: false,
    refetchInterval: (current) => {
      const status = current.state.data?.status;
      return status && terminalStatuses.includes(status) ? false : 3000;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!reference) {
      navigate('/payment/verify', { replace: true });
    }
  }, [reference, navigate]);

  useEffect(() => {
    const status = query.data?.status;
    if (status && terminalStatuses.includes(status)) {
      const timer = window.setTimeout(() => {
        navigate(`/payment/result/${encodeURIComponent(reference)}`, { replace: true });
      }, 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [query.data?.status, reference, navigate]);

  useEffect(() => {
    if (query.error) {
      setErrorCount((count) => count + 1);
      if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 409)) {
        navigate(`/payment/result/${encodeURIComponent(reference)}`, { replace: true });
      }
    }
  }, [query.error, query.errorUpdatedAt, reference, navigate]);

  if (!reference) {
    return null;
  }

  const payment = query.data;
  const statusCopy = payment?.status === 'PENDING' ? 'Payment received. Confirming with Paystack…' : 'Verifying your payment with Paystack…';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <ShieldCheck className="size-3.5 text-accent-600" />
            Secure verification
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-7 text-center shadow-[0_20px_60px_rgba(16,24,40,0.08)] sm:p-9">
          <div className="relative mx-auto flex size-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-100/70 [animation-duration:2.2s]" />
            <span className="absolute inset-2 rounded-full bg-brand-50" />
            <Loader2 className="relative size-8 animate-spin text-brand-600" />
          </div>

          <h1 className="mt-6 text-[20px] font-bold tracking-[-0.025em] text-navy-900">
            {payment?.status === 'PENDING' ? 'Confirming your payment' : 'Verifying your payment'}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{statusCopy}</p>

          {payment ? (
            <div className="mt-6 rounded-xl border border-border bg-canvas/70 p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-muted">Amount</span>
                <span className="text-[14px] font-bold text-navy-900">
                  {formatNgn(payment.amount / 100)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11.5px] text-muted">Reference</span>
                <span className="font-mono text-[11px] font-medium text-navy-800">{payment.reference}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11.5px] text-muted">Status</span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-600">
                  <Clock className="size-3.5" />
                  {payment.status === 'PENDING' ? 'Processing' : 'Verifying'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-canvas/70 p-4">
              <p className="font-mono text-[11px] text-slate-500">{reference}</p>
            </div>
          )}

          {errorCount >= 2 ? (
            <Alert tone="warning" className="mt-5 text-left" title="Still waiting for confirmation">
              Paystack has not confirmed this payment yet. You can wait a little longer or check the
              status again. No payment is marked successful without provider confirmation.
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
              Check status now
            </Button>
            <Button asChild variant="ghost">
              <Link to="/pay">
                <ArrowLeft />
                Back to checkout
              </Link>
            </Button>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="size-3" />
            This page refreshes automatically. Keep it open.
          </p>
        </div>
      </main>
    </div>
  );
}
