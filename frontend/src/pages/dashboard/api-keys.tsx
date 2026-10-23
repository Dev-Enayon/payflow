import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePageTitle } from '@/hooks/use-page-title';
import { keysService } from '@/services/keys.service';
import { ApiError } from '@/lib/api';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import type { ApiKey } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Give this key a descriptive name').max(60, 'Name is too long'),
  environment: z.enum(['TEST', 'LIVE']),
});

type FormValues = z.infer<typeof schema>;

export default function ApiKeysPage() {
  usePageTitle('API keys');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const query = useQuery({
    queryKey: ['api-keys'],
    queryFn: keysService.list,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', environment: 'TEST' },
  });

  const createMutation = useMutation({
    mutationFn: keysService.create,
    onSuccess: (data) => {
      setCreateOpen(false);
      setRevealedKey(data.key);
      form.reset({ name: '', environment: 'TEST' });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not create the API key.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => keysService.revoke(id),
    onSuccess: () => {
      toast.success('API key revoked');
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not revoke the API key.');
    },
  });

  const activeKeys = query.data?.filter((key) => !key.revokedAt) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="API keys"
        description="Server-side credentials for initializing and verifying payments."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Create key
          </Button>
        }
      />

      <Alert tone="info" title="Keep these keys on your server">
        API keys are shown once and stored as SHA-256 hashes. Never expose them in browser code, mobile
        apps or public repositories. They cannot be used to access the dashboard.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Active keys</p>
          <p className="mt-1.5 text-[22px] font-bold text-navy-900">{activeKeys.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Test keys</p>
          <p className="mt-1.5 text-[22px] font-bold text-navy-900">
            {activeKeys.filter((key) => key.environment === 'TEST').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Live keys</p>
          <p className="mt-1.5 text-[22px] font-bold text-navy-900">
            {activeKeys.filter((key) => key.environment === 'LIVE').length}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : query.error ? (
          <div className="p-5">
            <Alert tone="danger" title="Could not load API keys">
              {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
            </Alert>
          </div>
        ) : query.data && query.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-navy-900">{key.name}</p>
                        <p className="text-[10.5px] text-muted">Created {formatDate(key.createdAt)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] text-slate-600">
                      {key.keyPrefix}••••••••{key.lastFour}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.environment === 'LIVE' ? 'success' : 'info'}>
                      {key.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11.5px] text-muted">
                    {key.lastUsedAt ? formatTimeAgo(key.lastUsedAt) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.revokedAt ? 'danger' : 'neutral'}>
                      {key.revokedAt ? 'Revoked' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!key.revokedAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setRevokeTarget(key)}
                      >
                        <Trash2 />
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted">
                        {key.revokedAt ? formatTimeAgo(key.revokedAt) : ''}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={KeyRound}
            title="No API keys yet"
            description="Create a test key to start initializing payments from your server."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                Create your first key
              </Button>
            }
          />
        )}
      </Card>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-white p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" />
        <p className="text-[12px] leading-relaxed text-slate-600">
          Use the key as a bearer token:{' '}
          <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-navy-800">
            Authorization: Bearer pf_test_...
          </code>
          . Revoked keys stop working immediately and remain in the list for your records.
        </p>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset({ name: '', environment: 'TEST' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an API key</DialogTitle>
            <DialogDescription>
              The secret is displayed once. Store it in your server’s secret manager.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            noValidate
          >
            <Field label="Key name" htmlFor="key-name" error={form.formState.errors.name?.message}>
              <Input
                id="key-name"
                placeholder="Production checkout"
                autoFocus
                {...form.register('name')}
              />
            </Field>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-navy-800">Environment</label>
              <Select
                value={form.watch('environment')}
                onValueChange={(value) => form.setValue('environment', value as 'TEST' | 'LIVE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="LIVE">Live</SelectItem>
                </SelectContent>
              </Select>
              {form.watch('environment') === 'LIVE' ? (
                <p className="mt-1.5 text-[11px] text-amber-600">
                  Live keys can initiate real payments once live Paystack credentials are configured.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revealedKey)}
        onOpenChange={(open) => {
          if (!open) setRevealedKey(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy it now. For security, it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
            <p className="text-[11.5px] leading-relaxed text-amber-900">
              Store this secret on your server. Do not paste it into client-side code or commit it to git.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-canvas p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-navy-900">
              {revealedKey}
            </code>
            <CopyButton value={revealedKey ?? ''} label="API key copied" variant="outline" />
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>I have stored it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke this API key?"
        description={`“${revokeTarget?.name ?? ''}” will stop authenticating immediately. This cannot be undone.`}
        confirmLabel="Revoke key"
        destructive
        loading={revokeMutation.isPending}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
        }}
      />
    </div>
  );
}
