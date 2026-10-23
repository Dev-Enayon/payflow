import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Building2, Globe, Mail, Save, ServerCog, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/use-page-title';
import { adminService } from '@/services/admin.service';
import { ApiError, API_BASE_URL } from '@/lib/api';

const schema = z.object({
  brandName: z.string().trim().min(1, 'Brand name is required').max(60, 'Brand name is too long'),
  businessName: z.string().trim().min(1, 'Business name is required').max(120, 'Business name is too long'),
  supportEmail: z.string().trim().min(1, 'Support email is required').email('Enter a valid email address'),
  website: z
    .string()
    .trim()
    .max(300, 'Website URL is too long')
    .refine((value) => value === '' || /^https?:\/\/.+/i.test(value), 'Enter a valid http(s) URL'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminSettingsPage() {
  usePageTitle('Platform settings');
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminService.settings });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brandName: '',
      businessName: '',
      supportEmail: '',
      website: '',
    },
  });

  useEffect(() => {
    if (query.data) {
      form.reset({
        brandName: query.data.brandName,
        businessName: query.data.businessName,
        supportEmail: query.data.supportEmail,
        website: query.data.website ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminService.updateSettings({
        brandName: values.brandName,
        businessName: values.businessName,
        supportEmail: values.supportEmail,
        website: values.website || null,
        defaultCurrency: 'NGN',
      }),
    onSuccess: (data) => {
      toast.success('Platform settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
      form.reset({
        brandName: data.brandName,
        businessName: data.businessName,
        supportEmail: data.supportEmail,
        website: data.website ?? '',
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.details?.forEach((detail) => {
          if (detail.path in schema.shape) {
            form.setError(detail.path as keyof FormValues, { message: detail.message });
          }
        });
        toast.error(error.message);
      } else {
        toast.error('Could not save platform settings.');
      }
    },
  });

  const webhookUrl = `${API_BASE_URL}/webhooks/paystack`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform settings"
        description="Branding and contact details used across the checkout and dashboard."
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>These values are shown publicly on the checkout and footer.</CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : query.error ? (
              <Alert tone="danger" title="Could not load settings">
                {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
              </Alert>
            ) : (
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Brand name"
                    htmlFor="brandName"
                    error={form.formState.errors.brandName?.message}
                    hint="Short name shown in navigation."
                  >
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input id="brandName" className="pl-10" {...form.register('brandName')} />
                    </div>
                  </Field>
                  <Field
                    label="Business name"
                    htmlFor="businessName"
                    error={form.formState.errors.businessName?.message}
                    hint="Legal or trading name."
                  >
                    <Input id="businessName" {...form.register('businessName')} />
                  </Field>
                </div>
                <Field
                  label="Support email"
                  htmlFor="supportEmail"
                  error={form.formState.errors.supportEmail?.message}
                >
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="supportEmail" type="email" className="pl-10" {...form.register('supportEmail')} />
                  </div>
                </Field>
                <Field
                  label="Website"
                  htmlFor="website"
                  error={form.formState.errors.website?.message}
                  hint="Optional. Include https://"
                >
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="website" className="pl-10" placeholder="https://example.com" {...form.register('website')} />
                  </div>
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" loading={mutation.isPending} disabled={!form.formState.isDirty}>
                    <Save />
                    Save settings
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Managed through server environment variables.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted">Paystack mode</span>
                {query.data ? (
                  <Badge
                    variant={
                      query.data.mode === 'live'
                        ? 'success'
                        : query.data.mode === 'mock'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {query.data.mode === 'live' ? 'Live' : query.data.mode === 'mock' ? 'Mock' : 'Test'}
                  </Badge>
                ) : (
                  <Skeleton className="h-5 w-14 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-muted">Callback URL</p>
                <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-canvas p-2">
                  <code className="min-w-0 flex-1 break-all text-[10.5px] text-navy-800">
                    {query.data?.callbackUrl ?? '—'}
                  </code>
                  {query.data?.callbackUrl ? (
                    <CopyButton value={query.data.callbackUrl} label="Callback URL copied" />
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted">Paystack webhook URL</p>
                <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-canvas p-2">
                  <code className="min-w-0 flex-1 break-all text-[10.5px] text-navy-800">{webhookUrl}</code>
                  <CopyButton value={webhookUrl} label="Webhook URL copied" />
                </div>
              </div>
              <Alert tone="info" title="Environment changes require a restart">
                Paystack keys, callback URLs and mock mode are configured in the backend environment, not
                from this page.
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5">
                <ServerCog className="mt-0.5 size-4 text-slate-400" />
                <div>
                  <p className="text-[12px] font-medium text-navy-900">Provider credentials</p>
                  <p className="text-[11px] text-muted">Paystack secret and public keys, never exposed.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Webhook className="mt-0.5 size-4 text-slate-400" />
                <div>
                  <p className="text-[12px] font-medium text-navy-900">Event delivery</p>
                  <p className="text-[11px] text-muted">Endpoint secrets are encrypted with AES-256-GCM.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
                <div>
                  <p className="text-[12px] font-medium text-navy-900">Production checklist</p>
                  <p className="text-[11px] text-muted">
                    Disable mock mode, use HTTPS origins, set secure cookies and configure the live
                    Paystack webhook URL.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
