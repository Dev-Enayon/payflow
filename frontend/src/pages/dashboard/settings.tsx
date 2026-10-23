import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Building2, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePublicSettings } from '@/hooks/use-app-data';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  usePageTitle('Settings');
  const { user, updateUser } = useAuth();
  const { data: settings } = usePublicSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, email: user.email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.email]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authService.updateProfile(values),
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success('Profile updated');
      form.reset({ name: updated.name, email: updated.email });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.details?.forEach((detail) => {
          if (detail.path === 'name' || detail.path === 'email') {
            form.setError(detail.path, { message: detail.message });
          }
        });
        toast.error(error.message);
      } else {
        toast.error('Could not update your profile.');
      }
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account details and workspace information."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/security">
              <ShieldCheck />
              Security
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This information identifies you in the dashboard and audit logs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-canvas/60 p-3.5">
              <Avatar name={user?.name ?? 'User'} className="size-11" />
              <div>
                <p className="text-[13px] font-semibold text-navy-900">{user?.name}</p>
                <p className="text-[11.5px] text-muted">{user?.email}</p>
              </div>
              <Badge variant={user?.role === 'ADMIN' ? 'default' : 'neutral'} className="ml-auto">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Merchant'}
              </Badge>
            </div>

            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              noValidate
            >
              <Field label="Full name" htmlFor="name" error={form.formState.errors.name?.message}>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="name" className="pl-10" {...form.register('name')} />
                </div>
              </Field>
              <Field label="Email address" htmlFor="email" error={form.formState.errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="email" type="email" className="pl-10" {...form.register('email')} />
                </div>
              </Field>
              <div className="flex justify-end">
                <Button type="submit" loading={mutation.isPending} disabled={!form.formState.isDirty}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Role</span>
                <span className="font-medium text-navy-900">
                  {user?.role === 'ADMIN' ? 'Administrator' : 'Merchant'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Status</span>
                <Badge variant={user?.isActive ? 'success' : 'danger'}>
                  {user?.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Last sign in</span>
                <span className="font-medium text-navy-900">{formatDate(user?.lastLoginAt)}</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Member since</span>
                <span className="font-medium text-navy-900">{formatDate(user?.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Building2 className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[12.5px] font-medium text-navy-900">
                    {settings?.businessName ?? 'PayFlow'}
                  </p>
                  <p className="text-[11px] text-muted">{settings?.brandName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Support email</span>
                <span className="truncate font-medium text-navy-900">{settings?.supportEmail ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted">Currency</span>
                <span className="font-medium text-navy-900">{settings?.defaultCurrency ?? 'NGN'}</span>
              </div>
              {user?.role === 'ADMIN' ? (
                <Link
                  to="/admin/settings"
                  className="inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-brand-600 hover:underline"
                >
                  Edit platform settings
                  <ArrowRight className="size-3" />
                </Link>
              ) : (
                <p className="pt-1 text-[11px] leading-relaxed text-muted">
                  Business details are managed by a platform administrator.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
