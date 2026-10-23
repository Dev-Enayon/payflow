import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Clock3, RotateCcw, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/use-page-title';
import { paymentsService } from '@/services/payments.service';
import { ApiError } from '@/lib/api';
import { formatNgn } from '@/lib/utils';

type Outcome = 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending';

const outcomeButtons: Array<{
  outcome: Outcome;
  label: string;
  description: string;
  icon: typeof Check;
  className: string;
}> = [
  {
    outcome: 'success',
    label: 'Simulate successful payment',
    description: 'Marks the payment as paid and triggers reconciliation.',
    icon: Check,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  {
    outcome: 'failed',
    label: 'Simulate failed payment',
    description: 'Paystack-style decline for testing failure states.',
    icon: XCircle,
    className: 'border border-border bg-white text-red-600 hover:bg-red-50',
  },
  {
    outcome: 'abandoned',
    label: 'Simulate abandoned checkout',
    description: 'Customer closed the checkout without paying.',
    icon: X,
    className: 'border border-border bg-white text-slate-700 hover:bg-slate-50',
  },
  {
    outcome: 'reversed',
    label: 'Simulate reversal',
    description: 'A completed payment is later reversed or refunded.',
    icon: RotateCcw,
    className: 'border border-border bg-white text-amber-700 hover:bg-amber-50',
  },
  {
    outcome: 'pending',
    label: 'Leave pending',
    description: 'Keeps the payment in a pending state for polling tests.',
    icon: Clock3,
    className: 'border border-border bg-white text-sky-700 hover:bg-sky-50',
  },
];

export default function MockCheckoutPage() {
  usePageTitle('Mock checkout');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') ?? '';

  const query = useQuery({
    queryKey: ['payment', 'public', reference],
    queryFn: () => paymentsService.getPublic(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (outcome: Outcome) => paymentsService.completeMock(reference, outcome),
    onSuccess: (_data, outcome) => {
      toast.success(`Mock outcome recorded: ${outcome}`);
      navigate(`/payment/processing?reference=${encodeURIComponent(reference)}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not complete the mock payment. Is the backend running in mock mode?',
      );
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="bg-amber-400 px-4 py-2 text-center text-[11.5px] font-semibold text-amber-950">
        Mock gateway enabled · No real money moves and no card is charged
      </div>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-[64px] w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-[11.5px] font-medium text-slate-500">Local development only</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {!reference ? (
            <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
              <AlertTriangle className="mx-auto size-7 text-amber-500" />
              <h1 className="mt-4 text-lg font-bold text-navy-900">Missing reference</h1>
              <p className="mt-2 text-[13px] text-muted">
                Open this page from the checkout flow to simulate a payment.
              </p>
              <Button asChild className="mt-5 w-full">
                <Link to="/pay">Go to checkout</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_60px_rgba(16,24,40,0.08)]">
              <div className="border-b border-border bg-navy-900 px-6 py-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Mock Paystack checkout
                  </p>
                  <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Sandbox
                  </span>
                </div>
                <p className="mt-4 text-[32px] font-bold tracking-[-0.04em]">
                  {query.data ? formatNgn(query.data.amount / 100) : '—'}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{reference}</p>
              </div>

              <div className="p-6">
                {query.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ) : query.error ? (
                  <Alert tone="danger" title="Could not load this payment">
                    {query.error instanceof ApiError ? query.error.message : 'Try again from the checkout.'}
                  </Alert>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl border border-border bg-canvas/70 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] text-muted">Customer</span>
                        <span className="text-[11.5px] font-medium text-navy-900">
                          {query.data?.customerEmail}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[11.5px] text-muted">Status</span>
                        <span className="text-[11.5px] font-medium text-navy-900">{query.data?.status}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {outcomeButtons.map((item) => (
                        <button
                          key={item.outcome}
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate(item.outcome)}
                          className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${item.className}`}
                        >
                          <item.icon className="mt-0.5 size-4 shrink-0" />
                          <span>
                            <span className="block text-[12.5px] font-semibold">{item.label}</span>
                            <span className="mt-0.5 block text-[11px] opacity-70">{item.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Button asChild variant="ghost" className="mt-3 w-full">
                  <Link to="/pay">
                    <ArrowLeft />
                    Cancel and return to checkout
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
