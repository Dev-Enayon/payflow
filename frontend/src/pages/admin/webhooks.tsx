import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw, Search, Send, Webhook, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RecordStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CodeBlock } from '@/components/ui/code-block';
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { adminService } from '@/services/admin.service';
import { formatDate, formatTimeAgo, truncateMiddle } from '@/lib/utils';
import type { WebhookEvent } from '@/types';

function EventsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WebhookEvent | null>(null);
  const debouncedSearch = useDebounce(search);

  const query = useQuery({
    queryKey: ['admin', 'webhook-events', page, status, debouncedSearch],
    queryFn: () =>
      adminService.webhookEvents({
        page,
        pageSize: 25,
        ...(status !== 'ALL' ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search reference or event type"
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
                  <TableHead className="text-right">Details</TableHead>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                        <Eye />
                        View
                      </Button>
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
            title="No webhook events"
            description="Inbound Paystack events will appear here as they are received."
          />
        )}
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook event</DialogTitle>
            <DialogDescription>
              {selected?.eventType} · received {selected ? formatTimeAgo(selected.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10.5px] text-muted">Reference</p>
                  <p className="mt-0.5 font-mono text-[11px] text-navy-900">
                    {selected.reference ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10.5px] text-muted">Status</p>
                  <div className="mt-1">
                    <RecordStatusBadge status={selected.status} />
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10.5px] text-muted">Attempts</p>
                  <p className="mt-0.5 font-semibold text-navy-900">{selected.attempts}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10.5px] text-muted">Processed</p>
                  <p className="mt-0.5 text-navy-900">
                    {selected.processedAt ? formatDate(selected.processedAt) : '—'}
                  </p>
                </div>
              </div>
              {selected.error ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-[11.5px] text-red-700">
                  {selected.error}
                </div>
              ) : null}
              <CodeBlock
                code={JSON.stringify(selected.payload ?? {}, null, 2)}
                language="json"
                filename="payload.json"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveriesTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const query = useQuery({
    queryKey: ['admin', 'webhook-deliveries', page, status, debouncedSearch],
    queryFn: () =>
      adminService.webhookDeliveries({
        page,
        pageSize: 25,
        ...(status !== 'ALL' ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search reference, event or endpoint"
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
                  <TableHead>Attempts</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <p className="font-mono text-[11px] font-medium text-navy-900">
                        {delivery.eventType}
                      </p>
                      <p className="font-mono text-[10px] text-muted">{delivery.reference ?? '—'}</p>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <span
                        className="block truncate text-[11.5px] text-slate-600"
                        title={delivery.endpointUrl}
                      >
                        {delivery.endpointUrl ? truncateMiddle(delivery.endpointUrl, 40) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RecordStatusBadge status={delivery.status} />
                    </TableCell>
                    <TableCell className="text-[11.5px] text-slate-600">
                      {delivery.responseStatus ?? '—'}
                      {delivery.error ? (
                        <span
                          className="block max-w-[180px] truncate text-[10.5px] text-red-500"
                          title={delivery.error}
                        >
                          {delivery.error}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-[11.5px] text-muted">{delivery.attempts}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-[11.5px] text-muted">
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
            title="No deliveries"
            description="Outbound webhook deliveries will appear here."
          />
        )}
      </Card>
    </div>
  );
}

export default function AdminWebhooksPage() {
  usePageTitle('Webhook events');
  return (
    <div className="space-y-5">
      <PageHeader
        title="Webhook events"
        description="Inspect inbound Paystack events and outbound delivery results."
      />
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">
            <RefreshCw className="size-3.5" />
            Inbound events
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Send className="size-3.5" />
            Deliveries
          </TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
