import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, RecordStatusBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CodeBlock } from '@/components/ui/code-block';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePageTitle } from '@/hooks/use-page-title';
import { useDebounce } from '@/hooks/use-debounce';
import { WEBHOOK_EVENTS, webhooksService } from '@/services/webhooks.service';
import { ApiError, API_BASE_URL } from '@/lib/api';
import { cn, formatDate, formatTimeAgo, truncateMiddle } from '@/lib/utils';
import type { WebhookEndpoint } from '@/types';

const eventLabels = Object.fromEntries(WEBHOOK_EVENTS.map((event) => [event.value, event.label]));

const endpointSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Enter a valid URL')
    .refine((value) => /^https?:\/\//i.test(value), 'URL must start with http:// or https://'),
  description: z.string().trim().max(200, 'Description is too long').optional(),
  events: z.array(z.string()).min(1, 'Select at least one event'),
});

type EndpointForm = z.infer<typeof endpointSchema>;

function EndpointsTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['webhooks', 'endpoints'], queryFn: webhooksService.endpoints });

  const form = useForm<EndpointForm>({
    resolver: zodResolver(endpointSchema),
    defaultValues: { url: '', description: '', events: ['payment.success'] },
  });
  const selectedEvents = form.watch('events');

  const createMutation = useMutation({
    mutationFn: webhooksService.create,
    onSuccess: (data) => {
      setCreateOpen(false);
      setSecret(data.signingSecret);
      form.reset({ url: '', description: '', events: ['payment.success'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not create the endpoint.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      webhooksService.update(id, { isActive }),
    onSuccess: (data) => {
      toast.success(data.isActive ? 'Endpoint enabled' : 'Endpoint paused');
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update the endpoint.');
    },
  });

  const testMutation = useMutation({
    mutationFn: webhooksService.test,
    onSuccess: (delivery) => {
      if (delivery?.status === 'SUCCESS') {
        toast.success(`Test event delivered (${delivery.responseStatus ?? 200}).`);
      } else {
        toast.warning(
          delivery?.error
            ? `Test delivery failed: ${delivery.error}`
            : 'Test delivery failed. Check the endpoint URL.',
        );
      }
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not send the test event.');
    },
    onSettled: () => setTestingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksService.remove(id),
    onSuccess: () => {
      toast.success('Webhook endpoint deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete the endpoint.');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-navy-900">Outbound endpoints</h2>
          <p className="text-[12px] text-muted">
            Receive signed payment events on your server. Every request includes an HMAC signature.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus />
          Add endpoint
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid gap-3">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.error ? (
        <Alert tone="danger" title="Could not load endpoints">
          {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
        </Alert>
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-3">
          {query.data.map((endpoint) => (
            <Card key={endpoint.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          endpoint.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                        )}
                      />
                      <p className="truncate text-[13px] font-semibold text-navy-900" title={endpoint.url}>
                        {endpoint.url}
                      </p>
                      <CopyButton value={endpoint.url} label="Endpoint URL copied" />
                    </div>
                    {endpoint.description ? (
                      <p className="mt-1 text-[11.5px] text-muted">{endpoint.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {endpoint.events.map((event) => (
                        <Badge key={event} variant="neutral">
                          {eventLabels[event] ?? event}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                      <span>Signing secret ending {endpoint.secretLastFour}</span>
                      <span>{endpoint.deliveryCount} deliveries</span>
                      <span>
                        Last delivery: {endpoint.lastDeliveryAt ? formatTimeAgo(endpoint.lastDeliveryAt) : 'Never'}
                      </span>
                      {endpoint.lastDeliveryStatus ? (
                        <RecordStatusBadge status={endpoint.lastDeliveryStatus} />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                      <span className="text-[11px] font-medium text-slate-600">
                        {endpoint.isActive ? 'Active' : 'Paused'}
                      </span>
                      <Switch
                        checked={endpoint.isActive}
                        disabled={toggleMutation.isPending}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: endpoint.id, isActive: checked })
                        }
                        aria-label="Toggle endpoint"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testingId === endpoint.id}
                      onClick={() => {
                        setTestingId(endpoint.id);
                        testMutation.mutate(endpoint.id);
                      }}
                    >
                      {testingId === endpoint.id ? (
                        <RefreshCw className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:bg-red-50"
                      aria-label="Delete endpoint"
                      onClick={() => setDeleteTarget(endpoint)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Webhook}
            title="No endpoints configured"
            description="Add a server endpoint to receive payment.success, payment.failed and payment.reversed events."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                Add an endpoint
              </Button>
            }
          />
        </Card>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset({ url: '', description: '', events: ['payment.success'] });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a webhook endpoint</DialogTitle>
            <DialogDescription>
              We deliver signed JSON events over HTTPS. Private and loopback addresses are blocked in
              production.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate({
                url: values.url,
                description: values.description || undefined,
                events: values.events,
              }),
            )}
            noValidate
          >
            <Field label="Endpoint URL" htmlFor="endpoint-url" error={form.formState.errors.url?.message}>
              <Input
                id="endpoint-url"
                placeholder="https://api.yourstore.com/webhooks/payflow"
                autoFocus
                {...form.register('url')}
              />
            </Field>
            <Field
              label="Description (optional)"
              htmlFor="endpoint-description"
              error={form.formState.errors.description?.message}
            >
              <Textarea
                id="endpoint-description"
                placeholder="Order fulfilments"
                className="min-h-20"
                {...form.register('description')}
              />
            </Field>
            <div>
              <p className="text-[13px] font-semibold text-navy-800">Events</p>
              <div className="mt-2 space-y-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const checked = selectedEvents.includes(event.value);
                  return (
                    <button
                      key={event.value}
                      type="button"
                      onClick={() =>
                        form.setValue(
                          'events',
                          checked
                            ? selectedEvents.filter((value) => value !== event.value)
                            : [...selectedEvents, event.value],
                          { shouldValidate: true },
                        )
                      }
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                        checked
                          ? 'border-brand-200 bg-brand-50/60'
                          : 'border-border bg-white hover:border-slate-300',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 bg-white',
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <span>
                        <span className="block text-[12.5px] font-semibold text-navy-900">
                          {event.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">{event.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {form.formState.errors.events ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {form.formState.errors.events.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create endpoint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(secret)}
        onOpenChange={(open) => {
          if (!open) setSecret(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing secret</DialogTitle>
            <DialogDescription>
              Use this secret to verify the X-Payflow-Signature header. It is shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-canvas p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-navy-900">
              {secret}
            </code>
            <CopyButton value={secret ?? ''} label="Signing secret copied" variant="outline" />
          </div>
          <div className="mt-3">
            <CodeBlock
              code={`const expected = 'sha256=' + crypto
  .createHmac('sha256', process.env.PAYFLOW_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');

// Compare with timingSafeEqual(expected, req.headers['x-payflow-signature'])`}
              language="javascript"
              filename="verify-signature.js"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setSecret(null)}>I have stored it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this endpoint?"
        description={`Events will stop being delivered to ${deleteTarget?.url ?? 'this URL'}. Delivery history is removed with the endpoint.`}
        confirmLabel="Delete endpoint"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function EventsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const query = useQuery({
    queryKey: ['webhooks', 'events', page, status, debouncedSearch],
    queryFn: () =>
      webhooksService.events({
        page,
        pageSize: 20,
        ...(status !== 'ALL' ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-navy-900">Inbound Paystack events</h2>
          <p className="text-[12px] text-muted">
            Every event is signature-checked, deduplicated and independently verified with Paystack.
          </p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search by reference or event type"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="IGNORED">Ignored</SelectItem>
            </SelectContent>
          </Select>
          {search || status !== 'ALL' ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setPage(1);
              }}
            >
              <X />
              Clear
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : query.data && query.data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Event</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <span className="font-mono text-[11px] font-medium text-navy-900">
                        {event.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600">
                      {event.reference ?? '—'}
                    </TableCell>
                    <TableCell>
                      <RecordStatusBadge status={event.status} />
                    </TableCell>
                    <TableCell className="text-[11.5px] text-muted">{event.attempts}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11.5px] text-muted">
                      {formatDate(event.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="block truncate text-[11px] text-slate-500" title={event.error ?? undefined}>
                        {event.error ?? (event.processedAt ? `Processed ${formatTimeAgo(event.processedAt)}` : '—')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination pagination={query.data.pagination} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={Webhook}
            title="No inbound events"
            description="Paystack events will appear here after payments are made. Configure the webhook URL in your Paystack dashboard."
          />
        )}
      </Card>
    </div>
  );
}

function DeliveriesTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const query = useQuery({
    queryKey: ['webhooks', 'deliveries', page, status, debouncedSearch],
    queryFn: () =>
      webhooksService.deliveries({
        page,
        pageSize: 20,
        ...(status !== 'ALL' ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-navy-900">Outbound deliveries</h2>
        <p className="text-[12px] text-muted">
          Responses from your endpoints, including test deliveries and any errors returned.
        </p>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search by reference, event or endpoint"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="SUCCESS">Delivered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : query.data && query.data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Event</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <p className="font-mono text-[11px] font-medium text-navy-900">{delivery.eventType}</p>
                      <p className="font-mono text-[10px] text-muted">{delivery.reference ?? '—'}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="block truncate text-[11.5px] text-slate-600" title={delivery.endpointUrl}>
                        {delivery.endpointUrl ? truncateMiddle(delivery.endpointUrl, 38) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RecordStatusBadge status={delivery.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-[11.5px] text-slate-600">
                        {delivery.responseStatus ?? '—'}
                      </span>
                      {delivery.error ? (
                        <span className="block max-w-[200px] truncate text-[10.5px] text-red-500" title={delivery.error}>
                          {delivery.error}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-[11.5px] text-muted">
                      {delivery.durationMs !== null ? `${delivery.durationMs}ms` : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11.5px] text-muted">
                      {formatDate(delivery.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination pagination={query.data.pagination} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={Send}
            title="No deliveries yet"
            description="Send a test event from an endpoint to see the delivery result here."
          />
        )}
      </Card>
    </div>
  );
}

export default function WebhooksPage() {
  usePageTitle('Webhooks');
  const webhookUrl = `${API_BASE_URL}/webhooks/paystack`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Webhooks"
        description="Connect Paystack to your store and deliver signed payment events to your server."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-canvas/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Paystack webhook URL
            </p>
            <code className="mt-1 block truncate font-mono text-[12px] text-navy-900">{webhookUrl}</code>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={webhookUrl} label="Webhook URL copied" variant="outline" size="sm" />
            <Button asChild variant="ghost" size="sm">
              <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noreferrer">
                Paystack dashboard
                <ExternalLink />
              </a>
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-[11.5px] leading-relaxed text-slate-600">
              Paste this URL in your Paystack dashboard and enable charge.success and refund.processed
              events. PayFlow verifies every event with Paystack before changing a transaction status.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">
            <Webhook className="size-3.5" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="events">
            <RefreshCw className="size-3.5" />
            Inbound events
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Send className="size-3.5" />
            Deliveries
          </TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints">
          <EndpointsTab />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>
      </Tabs>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-white p-4">
        <Copy className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          Endpoint secrets are encrypted at rest with AES-256-GCM. Signature verification should be done
          on the raw request body, before JSON parsing, using a constant-time comparison.
        </p>
      </div>
    </div>
  );
}
