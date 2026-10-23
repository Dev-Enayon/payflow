import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, ScrollText, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { adminService } from '@/services/admin.service';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import type { AuditLog } from '@/types';

const actionTone = (action: string) => {
  if (action.includes('failed') || action.includes('deleted') || action.includes('revoked')) return 'danger';
  if (action.includes('login') || action.includes('created') || action.includes('processed')) return 'success';
  if (action.includes('updated') || action.includes('tested')) return 'info';
  return 'neutral';
};

export default function AdminAuditLogsPage() {
  usePageTitle('Audit logs');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const debouncedSearch = useDebounce(search);

  const query = useQuery({
    queryKey: ['admin', 'audit-logs', page, debouncedSearch, from, to],
    queryFn: () =>
      adminService.auditLogs({
        page,
        pageSize: 25,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
  });

  const hasFilters = Boolean(search || from || to);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit logs"
        description="A chronological record of sensitive actions across the platform."
      />

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search action, actor, entity"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Input
            type="date"
            aria-label="From date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            aria-label="To date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="ghost"
            disabled={!hasFilters}
            onClick={() => {
              setSearch('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
          >
            <X />
            Clear
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : query.data && query.data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={actionTone(log.action)}>
                        <span className="font-mono text-[10px]">{log.action}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">{log.actorEmail ?? 'System'}</TableCell>
                    <TableCell className="text-[11.5px] text-muted">
                      {log.entityType ?? '—'}
                      {log.entityId ? (
                        <span className="block max-w-[160px] truncate font-mono text-[10px] text-slate-400">
                          {log.entityId}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-[10.5px] text-muted">{log.ip ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11.5px] text-muted">
                      <span title={formatDate(log.createdAt)}>{formatTimeAgo(log.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>
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
            icon={ScrollText}
            title="No audit entries"
            description={hasFilters ? 'No entries match these filters.' : 'Sensitive actions will be recorded here.'}
          />
        )}
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>
              {selected?.action} · {selected ? formatDate(selected.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Actor', selected.actorEmail ?? 'System'],
                  ['Action', selected.action],
                  ['Entity type', selected.entityType ?? '—'],
                  ['Entity ID', selected.entityId ?? '—'],
                  ['IP address', selected.ip ?? '—'],
                  ['User agent', selected.userAgent ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <p className="text-[10.5px] text-muted">{label}</p>
                    <p className="mt-0.5 break-words text-[11.5px] font-medium text-navy-900">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Metadata
                </p>
                <CodeBlock
                  code={JSON.stringify(selected.metadata ?? {}, null, 2)}
                  language="json"
                  filename="metadata.json"
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
