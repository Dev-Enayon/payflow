import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, Input } from '@/components/ui/input';
import { Logo, LogoMark } from '@/components/ui/logo';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from '@/hooks/use-page-title';
import { useHealth, usePublicSettings } from '@/hooks/use-app-data';
import { paymentsService } from '@/services/payments.service';
import { ApiError } from '@/lib/api';
import { cn, formatNgn } from '@/lib/utils';

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 5_000_000;
const presets = [2000, 5000, 10000, 25000, 50000];

const schema = z.object({
  email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value.replace(/,/g, '')), {
      message: 'Enter a valid amount with up to 2 decimal places',
    })
    .refine((value) => Number(value.replace(/,/g, '')) >= MIN_AMOUNT, {
      message: `The minimum payment amount is ${formatNgn(MIN_AMOUNT)}`,
    })
    .refine((value) => Number(value.replace(/,/g, '')) <= MAX_AMOUNT, {
      message: `The maximum payment amount is ${formatNgn(MAX_AMOUNT)}`,
    }),
});

type FormValues = z.infer<typeof schema>;

export default function CheckoutPage() {
  usePageTitle('Checkout');
  const { data: settings } = usePublicSettings();
  const { data: health } = useHealth();
  const [redirecting, setRedirecting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', amount: '25000' },
  });

  const amountValue = Number((form.watch('amount') || '0').replace(/,/g, ''));
  const validAmount = Number.isFinite(amountValue) && amountValue >= MIN_AMOUNT;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      paymentsService.initialize({
        email: values.email,
        amount: Number(values.amount.replace(/,/g, '')),
      }),
    onSuccess: (data) => {
      setRedirecting(true);
      window.location.assign(data.authorizationUrl);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.details?.forEach((detail) => {
          if (detail.path === 'email' || detail.path === 'amount') {
            form.setError(detail.path, { message: detail.message });
          }
        });
        toast.error(error.message);
      } else {
        toast.error('Could not start the payment. Please try again.');
      }
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            {health ? (
              <Badge
                variant={health.paystackMode === 'mock' ? 'warning' : health.paystackMode === 'live' ? 'success' : 'info'}
              >
                {health.paystackMode === 'mock'
                  ? 'Mock gateway'
                  : health.paystackMode === 'live'
                    ? 'Live payments'
                    : 'Test mode'}
              </Badge>
            ) : null}
            <span className="hidden items-center gap-1.5 text-[12px] font-medium text-slate-500 sm:flex">
              <Lock className="size-3.5" />
              Secure checkout
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-white shadow-[0_24px_80px_rgba(16,24,40,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="relative overflow-hidden bg-navy-900 p-7 text-white sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-accent-500/10 blur-3xl" />
            <div className="relative">
              <LogoMark className="size-11 rounded-xl" />
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-400">
                Payment summary
              </p>
              <p className="mt-3 text-[38px] font-bold leading-none tracking-[-0.04em]">
                {validAmount ? formatNgn(amountValue) : '₦0.00'}
              </p>
              <p className="mt-2 text-[13px] text-slate-300">
                {settings?.businessName ?? 'Merchant'} · NGN
              </p>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
                {[
                  { icon: ShieldCheck, title: 'Verified with Paystack', body: 'Confirmed server-side before it counts.' },
                  { icon: Lock, title: 'Card details stay with Paystack', body: 'Hosted checkout keeps sensitive data off this site.' },
                  { icon: CheckCircle2, title: 'Instant confirmation', body: 'A receipt and reference are issued after payment.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-400">
                      <item.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3.5">
                <p className="text-[11px] leading-relaxed text-slate-300">
                  You will be redirected to Paystack to complete this payment. {settings?.brandName ?? 'PayFlow'}{' '}
                  never sees or stores your card details.
                </p>
              </div>
            </div>
          </aside>

          <section className="p-6 sm:p-10">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Wallet className="size-4" />
              </span>
              <div>
                <h1 className="text-[18px] font-bold tracking-[-0.02em] text-navy-900">Make a payment</h1>
                <p className="text-[12px] text-muted">Enter an email and the amount to pay.</p>
              </div>
            </div>

            <form
              className="mt-7 space-y-5"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              noValidate
            >
              <Field label="Email address" htmlFor="email" error={form.formState.errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    {...form.register('email')}
                  />
                </div>
              </Field>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="amount" className="text-[13px] font-semibold text-navy-800">
                    Amount
                  </label>
                  <span className="text-[11px] text-muted">Min {formatNgn(MIN_AMOUNT)}</span>
                </div>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-slate-400">
                    ₦
                  </span>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="25000"
                    className="h-12 pl-8 text-[16px] font-semibold"
                    {...form.register('amount')}
                  />
                </div>
                <FieldError>{form.formState.errors.amount?.message}</FieldError>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {presets.map((preset) => {
                    const selected = amountValue === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('amount', String(preset), { shouldValidate: true })}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors',
                          selected
                            ? 'border-brand-200 bg-brand-50 text-brand-700'
                            : 'border-border bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        {formatNgn(preset).replace('.00', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-canvas/60 px-3.5 py-3">
                <span className="flex items-center gap-2 text-[12px] text-slate-600">
                  <CreditCard className="size-4 text-slate-400" />
                  Total due
                </span>
                <span className="text-[15px] font-bold text-navy-900">
                  {validAmount ? formatNgn(amountValue) : '₦0.00'}
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={mutation.isPending || redirecting}
              >
                {redirecting ? 'Redirecting to Paystack…' : 'Continue to secure payment'}
                {!redirecting ? <ArrowRight /> : null}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
                <Lock className="size-3" />
                Your payment is encrypted and processed by Paystack
              </p>
            </form>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <p className="text-[11.5px] leading-relaxed text-brand-900/80">
                After paying, keep this tab open. You will be redirected back automatically to view your
                receipt.
              </p>
            </div>
          </section>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-5xl flex-col items-center justify-between gap-2 text-[11.5px] text-muted sm:flex-row">
          <p>
            Need help?{' '}
            <a
              href={`mailto:${settings?.supportEmail ?? 'support@payflow.local'}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {settings?.supportEmail ?? 'Contact support'}
            </a>
          </p>
          <Link to="/" className="font-medium text-slate-500 hover:text-navy-900">
            Back to {settings?.brandName ?? 'home'}
          </Link>
        </div>
      </main>
    </div>
  );
}
