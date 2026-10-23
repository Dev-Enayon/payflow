import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { usePageTitle } from '@/hooks/use-page-title';

export default function PaymentCallbackPage() {
  usePageTitle('Returning to your payment');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';
  const [manualReference, setManualReference] = useState('');

  useEffect(() => {
    if (reference) {
      navigate(`/payment/processing?reference=${encodeURIComponent(reference)}`, { replace: true });
    }
  }, [reference, navigate]);

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
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-[0_20px_60px_rgba(16,24,40,0.08)] sm:p-9">
          {reference ? (
            <div className="text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-brand-600" />
              <h1 className="mt-5 text-[19px] font-bold text-navy-900">Returning to your payment</h1>
              <p className="mt-2 text-[13px] text-muted">Taking you to the verification page…</p>
            </div>
          ) : (
            <>
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Search className="size-5" />
              </span>
              <h1 className="mt-4 text-[20px] font-bold tracking-[-0.025em] text-navy-900">
                Find your payment
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Enter the transaction reference from your payment receipt to check its status.
              </p>
              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (manualReference.trim()) {
                    navigate(`/payment/processing?reference=${encodeURIComponent(manualReference.trim())}`);
                  }
                }}
              >
                <Field label="Transaction reference" htmlFor="reference">
                  <Input
                    id="reference"
                    placeholder="PF-XXXXXXXX-XXXX"
                    value={manualReference}
                    onChange={(event) => setManualReference(event.target.value)}
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={!manualReference.trim()}>
                  Check payment status
                  <ArrowRight />
                </Button>
              </form>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <Link to="/pay">Back to checkout</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
