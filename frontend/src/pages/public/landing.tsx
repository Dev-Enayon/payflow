import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CreditCard,
  FileCode2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { LogoMark } from '@/components/ui/logo';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePublicSettings } from '@/hooks/use-app-data';
import { BRAND_NAME } from '@/lib/utils';

const features = [
  {
    icon: ShieldCheck,
    title: 'Server-side verification',
    body: 'Every callback is re-verified directly with Paystack before a payment is marked successful. The browser is never trusted.',
  },
  {
    icon: CreditCard,
    title: 'Tokenized checkout',
    body: 'Customers complete payment on Paystack’s secure hosted checkout. Card details never touch PayFlow servers.',
  },
  {
    icon: Webhook,
    title: 'Signed event delivery',
    body: 'Inbound events are validated with a timing-safe HMAC SHA-512 signature and deduplicated by payload hash.',
  },
  {
    icon: RefreshCw,
    title: 'Guarded reconciliation',
    body: 'Status transitions are conditional, so a delayed or failed provider check can never downgrade a settled payment.',
  },
  {
    icon: Terminal,
    title: 'API-first integration',
    body: 'Initialize and verify payments with scoped test and live API keys, predictable JSON responses and clear errors.',
  },
  {
    icon: BarChart3,
    title: 'One source of truth',
    body: 'Volume, success rate, customer details and every state change live in a single focused operational dashboard.',
  },
];

const steps = [
  {
    title: 'Initialize',
    body: 'Your customer enters an email and amount on the checkout page, or your server calls the initialize endpoint.',
  },
  {
    title: 'Pay on Paystack',
    body: 'The customer is redirected to Paystack’s hosted checkout and completes payment securely.',
  },
  {
    title: 'Verify & reconcile',
    body: 'PayFlow confirms the transaction with Paystack and compares amount, currency and reference before trusting it.',
  },
  {
    title: 'Notify',
    body: 'A signed webhook is delivered to your endpoint and an audit trail records the full lifecycle.',
  },
];

const securityControls = [
  'Payments independently verified with Paystack',
  'Timing-safe HMAC SHA-512 webhook checks',
  'Opaque, HTTP-only session cookies',
  'CSRF and origin checks on writes',
  'Argon2id password hashing',
  'AES-256-GCM encrypted webhook secrets',
  'SSRF-safe outbound delivery',
  'Rate limits on authentication and payments',
];

const curlSnippet = `curl -X POST https://api.payflow.local/api/payments/initialize \\
  -H "Authorization: Bearer pf_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "customer@example.com",
    "amount": 25000
  }'`;

const responseSnippet = `{
  "data": {
    "reference": "PF-7F3A9C21-4D8E",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "amountKobo": 2500000,
    "amountNgn": 25000,
    "currency": "NGN"
  }
}`;

export default function LandingPage() {
  usePageTitle();
  const { data: settings } = usePublicSettings();
  const brand = settings?.brandName ?? BRAND_NAME;

  return (
    <main>
      <section className="relative overflow-hidden pf-hero-grid">
        <div className="pointer-events-none absolute inset-0 pf-grid-pattern opacity-60" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-20">
          <div className="pf-animate-in">
            <Badge className="gap-2 border-brand-100 bg-white/80 py-1.5 shadow-sm">
              <Sparkles className="size-3.5 text-brand-600" />
              Payment infrastructure, simplified
            </Badge>
            <h1 className="mt-5 max-w-xl text-[42px] font-extrabold leading-[1.05] tracking-[-0.045em] text-navy-900 sm:text-[56px]">
              Payments your business can <span className="pf-gradient-text">trust.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-600 sm:text-base">
              {brand} is a production-grade gateway on top of Paystack. Accept payments, verify every
              naira server-side, and reconcile your transactions without guesswork.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-[0_10px_30px_rgba(49,92,255,0.25)]">
                <Link to="/pay">
                  Make a payment
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Open dashboard</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-accent-600" />
                Verified server-side
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-4 text-accent-600" />
                Hosted Paystack checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-4 text-accent-600" />
                Built for NGN
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px] pf-animate-in" style={{ animationDelay: '120ms' }}>
            <div className="absolute -left-10 -top-10 size-44 rounded-full bg-brand-400/20 blur-3xl" />
            <div className="absolute -bottom-12 -right-8 size-44 rounded-full bg-accent-400/20 blur-3xl" />
            <div className="relative rounded-[22px] border border-border bg-white p-5 shadow-[0_24px_80px_rgba(16,24,40,0.14)] sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <LogoMark className="size-8 rounded-[9px]" />
                  <div>
                    <p className="text-[12px] font-semibold text-navy-900">Payment request</p>
                    <p className="text-[10.5px] text-muted">Secure hosted checkout</p>
                  </div>
                </div>
                <Badge variant="success">Live</Badge>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-canvas/70 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                  Amount due
                </p>
                <p className="mt-1 text-[30px] font-bold tracking-[-0.04em] text-navy-900">₦25,000.00</p>
                <p className="mt-0.5 text-[11px] text-muted">Reference · PF-7F3A9C21</p>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-slate-600">Email address</p>
                  <div className="flex h-10 items-center rounded-lg border border-border bg-white px-3 text-[12.5px] text-slate-500">
                    customer@example.com
                  </div>
                </div>
                <div className="flex h-11 items-center justify-center rounded-xl bg-brand-600 text-[13px] font-semibold text-white shadow-sm">
                  Pay ₦25,000.00
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-muted">
                <Lock className="size-3" />
                Secured by Paystack · Card details never touch {brand}
              </div>
            </div>

            <div className="absolute -bottom-7 -left-3 flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-lg sm:-left-8">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50">
                <Check className="size-4 text-emerald-600" />
              </span>
              <div>
                <p className="text-[11.5px] font-semibold text-navy-900">Payment verified</p>
                <p className="text-[10px] text-muted">Confirmed with Paystack</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-border px-4 sm:px-6 lg:grid-cols-4">
          {[
            ['Server-side verification', 'Paystack is the source of truth'],
            ['Signed webhooks', 'HMAC SHA-512, timing-safe'],
            ['Idempotent processing', 'Safe redelivery and retries'],
            ['Role-based access', 'Separate merchant and admin'],
          ].map(([title, body], index) => (
            <div
              key={title}
              className={`px-4 py-6 sm:px-6 ${index > 1 ? 'border-t border-border lg:border-t-0' : ''}`}
            >
              <p className="text-[13px] font-semibold text-navy-900">{title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
            Built for correctness
          </p>
          <h2 className="mt-3 text-[32px] font-bold leading-[1.15] tracking-[-0.035em] text-navy-900 sm:text-[38px]">
            Everything you need to take payments seriously.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-slate-600">
            Not another wrapper around a checkout button. {brand} handles verification, reconciliation,
            webhooks and the operational details that protect your revenue.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-[14.5px] font-semibold text-navy-900">{feature.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-border bg-canvas">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                How it works
              </p>
              <h2 className="mt-3 text-[32px] font-bold leading-[1.15] tracking-[-0.035em] text-navy-900 sm:text-[38px]">
                From checkout to confirmed, in four steps.
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link to="/pay">
                Try the checkout
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative rounded-2xl border border-border bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-full bg-navy-900 text-[12px] font-bold text-white">
                    {index + 1}
                  </span>
                  {index < steps.length - 1 ? (
                    <ArrowRight className="hidden size-4 text-slate-300 lg:block" />
                  ) : null}
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-navy-900">{step.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="developers" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-24">
        <div className="overflow-hidden rounded-3xl bg-navy-900 text-white">
          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-400">
                Developer experience
              </p>
              <h2 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.035em] sm:text-[36px]">
                An API that behaves the way you expect.
              </h2>
              <p className="mt-4 text-[13.5px] leading-relaxed text-slate-300">
                Initialize a payment in one request, then verify it from your server. Errors are typed,
                references are unique, and every state change is recorded.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Scoped test and live API keys, hashed at rest',
                  'Explicit error codes for validation and provider failures',
                  'Webhook retries with idempotent processing',
                  'Audit logs for every sensitive action',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-200">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button asChild variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/15">
                  <Link to="/dashboard/integration">
                    Integration guide
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
                  <Link to="/login">
                    <FileCode2 />
                    Open dashboard
                  </Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <CodeBlock code={curlSnippet} language="bash" filename="initialize.sh" />
              <CodeBlock code={responseSnippet} language="json" filename="201 Created" />
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-24 border-y border-border bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Security</p>
            <h2 className="mt-3 text-[32px] font-bold leading-[1.15] tracking-[-0.035em] text-navy-900 sm:text-[38px]">
              Designed to protect every transaction.
            </h2>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-slate-600">
              Payment state is only changed after a direct provider check. Signatures are compared in
              constant time, secrets are encrypted, and privileged actions require an authenticated
              session with role checks on the server.
            </p>
            <div className="mt-7 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {securityControls.map((control) => (
                <div key={control} className="flex items-start gap-2 text-[12.5px] text-slate-700">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-accent-600" />
                  {control}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-border bg-canvas p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-navy-900">Verification pipeline</p>
                  <p className="text-[11.5px] text-muted">Every payment, every time</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { label: 'Paystack checkout', detail: 'Customer authorizes payment' },
                  { label: 'Signature check', detail: 'HMAC SHA-512, constant time' },
                  { label: 'Provider verification', detail: 'Amount, currency and reference' },
                  { label: 'Reconciliation', detail: 'Guarded, monotonic status change' },
                  { label: 'Signed delivery', detail: 'Merchant endpoint notified' },
                ].map((item, index) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-navy-900">{item.label}</p>
                      <p className="text-[10.5px] text-muted">{item.detail}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-navy-900 px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent-400/20 blur-3xl" />
          <h2 className="relative text-[28px] font-bold tracking-[-0.03em] text-white sm:text-[34px]">
            Ready to accept your next payment?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[13.5px] leading-relaxed text-brand-100">
            Start with the checkout page, then connect your server with an API key when you are ready.
          </p>
          <div className="relative mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
              <Link to="/pay">
                Make a payment
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link to="/login">Sign in to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
