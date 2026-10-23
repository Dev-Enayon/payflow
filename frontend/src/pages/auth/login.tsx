import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Logo, LogoMark } from '@/components/ui/logo';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePublicSettings } from '@/hooks/use-app-data';
import { ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  usePageTitle(adminMode ? 'Administrator sign in' : 'Sign in');
  const { login } = useAuth();
  const { data: settings } = usePublicSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

      if (adminMode && user.role !== 'ADMIN') {
        toast.error('This account does not have administrator access.');
        navigate('/dashboard', { replace: true });
        return;
      }

      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(safeNext ?? (user.role === 'ADMIN' ? '/admin' : '/dashboard'), { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(
          error.status === 401
            ? 'Invalid email or password. Please try again.'
            : error.message,
        );
      } else {
        setFormError('Unable to sign in right now. Please try again.');
      }
    }
  });

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1fr]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-navy-900"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <div>
            {adminMode ? (
              <Badge variant="neutral" className="mb-4 gap-1.5">
                <ShieldCheck className="size-3" />
                Administrator access
              </Badge>
            ) : null}
            <h1 className="text-[28px] font-bold tracking-[-0.035em] text-navy-900">
              {adminMode ? 'Sign in to the platform console' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {adminMode
                ? 'Use an administrator account to review payments, users and platform settings.'
                : `Sign in to your ${settings?.brandName ?? 'PayFlow'} merchant workspace.`}
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
            <Field label="Email address" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...form.register('email')}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pr-11"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-800"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {formError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">
                {formError}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
              {adminMode ? 'Sign in to platform' : 'Sign in'}
              {!form.formState.isSubmitting ? <ArrowRight /> : null}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-center text-[12px] text-muted">
              {adminMode ? (
                <>
                  Merchant account?{' '}
                  <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                    Sign in here
                  </Link>
                </>
              ) : (
                <>
                  Administrator?{' '}
                  <Link to="/admin/login" className="font-semibold text-brand-600 hover:underline">
                    Use the platform console
                  </Link>
                </>
              )}
            </p>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="size-3" />
              Sessions are protected with HTTP-only cookies and CSRF checks.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Having trouble?{' '}
          <a
            href={`mailto:${settings?.supportEmail ?? 'support@payflow.local'}`}
            className="font-medium text-slate-600 hover:underline"
          >
            {settings?.supportEmail ?? 'Contact support'}
          </a>
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative flex flex-1 flex-col justify-center p-12 xl:p-16">
          <LogoMark className="size-12 rounded-2xl" />
          <h2 className="mt-8 max-w-md text-[34px] font-bold leading-[1.15] tracking-[-0.035em] text-white">
            {adminMode ? 'Operate the platform with a complete audit trail.' : 'Your payments, verified and accounted for.'}
          </h2>
          <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-slate-400">
            {adminMode
              ? 'Review every transaction, monitor webhook health and inspect privileged actions across the platform.'
              : 'Track volume, reconcile transactions and connect your stack with API keys and signed webhooks.'}
          </p>

          <div className="mt-10 space-y-3">
            {(adminMode
              ? [
                  { icon: ShieldCheck, title: 'Role-based access', body: 'Admin routes are guarded on the server.' },
                  { icon: CheckCircle2, title: 'Complete audit logs', body: 'Sensitive actions record actor, IP and time.' },
                  { icon: Webhook, title: 'Webhook oversight', body: 'Inspect inbound events and outbound deliveries.' },
                ]
              : [
                  { icon: ShieldCheck, title: 'Server-side verification', body: 'Paystack confirms every payment.' },
                  { icon: CheckCircle2, title: 'Guarded reconciliation', body: 'Settled payments are never downgraded.' },
                  { icon: Webhook, title: 'Signed webhooks', body: 'HMAC SHA-512 with idempotent processing.' },
                ]
            ).map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-400">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative border-t border-white/10 px-12 py-5 xl:px-16">
          <p className="text-[11px] text-slate-500">
            {settings?.businessName ?? 'PayFlow'} · Payments processed by Paystack
          </p>
        </div>
      </div>
    </div>
  );
}
