import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clock3,
  KeyRound,
  Laptop,
  Lock,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { usePageTitle } from '@/hooks/use-page-title';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api';
import { formatDate, formatTimeAgo } from '@/lib/utils';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(10, 'Use at least 10 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = /Firefox/i.test(userAgent)
    ? 'Firefox'
    : /Edg/i.test(userAgent)
      ? 'Edge'
      : /Chrome/i.test(userAgent)
        ? 'Chrome'
        : /Safari/i.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Mac OS/i.test(userAgent)
      ? 'macOS'
      : /Android/i.test(userAgent)
        ? 'Android'
        : /iPhone|iPad/i.test(userAgent)
          ? 'iOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

export default function SecurityPage() {
  usePageTitle('Security');
  const queryClient = useQueryClient();

  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: authService.sessions });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: FormValues) => authService.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      toast.success('Password updated. Other sessions have been signed out.');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'INVALID_CREDENTIALS' || error.status === 400) {
          form.setError('currentPassword', { message: error.message });
        }
        toast.error(error.message);
      } else {
        toast.error('Could not update your password.');
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authService.revokeSession(id),
    onSuccess: () => {
      toast.success('Session revoked');
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not revoke the session.');
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security"
        description="Manage your password and review devices signed in to your account."
      />

      <Alert tone="info" title="How your account is protected">
        Passwords are hashed with Argon2id. Sessions use opaque, HTTP-only cookies with CSRF protection,
        and state-changing requests are checked against allowed origins.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Changing your password signs out every other session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => passwordMutation.mutate(values))}
              noValidate
            >
              <Field
                label="Current password"
                htmlFor="current-password"
                error={form.formState.errors.currentPassword?.message}
              >
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('currentPassword')}
                />
              </Field>
              <Field
                label="New password"
                htmlFor="new-password"
                error={form.formState.errors.newPassword?.message}
                hint="At least 10 characters."
              >
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register('newPassword')}
                />
              </Field>
              <Field
                label="Confirm new password"
                htmlFor="confirm-password"
                error={form.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register('confirmPassword')}
                />
              </Field>
              <Button type="submit" className="w-full" loading={passwordMutation.isPending}>
                <Lock />
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Active sessions</CardTitle>
                <CardDescription>Devices currently signed in to your account.</CardDescription>
              </div>
              <Badge variant="neutral">
                <ShieldCheck className="size-3" />
                {sessions.data?.length ?? 0}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.isLoading ? (
                [0, 1].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)
              ) : sessions.error ? (
                <Alert tone="danger" title="Could not load sessions">
                  {sessions.error instanceof Error ? sessions.error.message : 'Please refresh.'}
                </Alert>
              ) : sessions.data && sessions.data.length > 0 ? (
                sessions.data.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-slate-500">
                      {/Mobi|Android|iPhone/i.test(session.userAgent ?? '') ? (
                        <Smartphone className="size-4" />
                      ) : (
                        <Laptop className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-navy-900">
                          {deviceLabel(session.userAgent)}
                        </p>
                        {session.isCurrent ? <Badge variant="success">This device</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {session.ip ?? 'Unknown IP'} · Active {formatTimeAgo(session.lastSeenAt)}
                      </p>
                      <p className="text-[10.5px] text-slate-400">
                        Signed in {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}
                      </p>
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:bg-red-50"
                        aria-label="Revoke session"
                        onClick={() => revokeMutation.mutate(session.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState icon={Clock3} title="No active sessions" description="No sessions found." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                'Argon2id password hashing',
                'HTTP-only session cookies',
                'CSRF and origin validation',
                'Role checks on every protected route',
                'Rate limits on authentication and payments',
                'Audit logging for sensitive actions',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-slate-600">
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <KeyRound className="size-2.5" />
                  </span>
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
