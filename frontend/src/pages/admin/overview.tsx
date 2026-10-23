import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
  Webhook,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatsSkeleton, Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { TransactionsTable } from '@/components/dashboard/transactions-table';
import { usePageTitle } from '@/hooks/use-page-title';
import { adminService } from '@/services/admin.service';
import { formatDateShort, formatNgn, formatNumber, formatTimeAgo } from '@/lib/utils';

function compactNgn(value: number): string {
  return `₦${new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)}`;
}

export default function AdminOverviewPage() {
  usePageTitle('Platform overview');
  const query = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminService.overview,
  });

  const data = query.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform overview"
        description="A view across every workspace, transaction and webhook."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit-logs">
                <ScrollText />
                Audit logs
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/transactions">
                <CreditCard />
                All transactions
              </Link>
            </Button>
          </>
        }
      />

      {data?.mode === 'mock' ? (
        <Alert tone="warning" title="Mock gateway environment">
          This environment simulates Paystack locally. Switch PAYSTACK_MOCK to false and configure live or
          test credentials before accepting real payments.
        </Alert>
      ) : null}

      {query.isLoading ? (
        <StatsSkeleton />
      ) : query.error ? (
        <Alert tone="danger" title="Could not load platform overview">
          {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total volume"
              value={formatNgn(data.volumeNgn)}
              hint="All successful payments"
              icon={Wallet}
            />
            <StatCard
              label="Transactions"
              value={formatNumber(data.transactions)}
              hint={`${formatNumber(data.successful)} successful`}
              icon={CreditCard}
              tone="accent"
            />
            <StatCard
              label="Success rate"
              value={`${data.successRate}%`}
              hint={`${data.today.successful} of ${data.today.payments} today`}
              icon={CheckCircle2}
              tone="amber"
            />
            <StatCard
              label="Users"
              value={formatNumber(data.users)}
              hint={`${data.roles.ADMIN ?? 0} admins · ${data.roles.MERCHANT ?? 0} merchants`}
              icon={Users}
              tone="slate"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Platform volume</CardTitle>
                  <p className="mt-0.5 text-[12px] text-muted">Successful payments over 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-navy-900">{formatNgn(data.volumeNgn)}</p>
                  <p className="text-[10.5px] text-muted">{formatNumber(data.transactions)} transactions</p>
                </div>
              </CardHeader>
              <CardContent>
                {data.series.length > 0 ? (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.series} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#12c9a7" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#12c9a7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => formatDateShort(String(value)).replace(/ \d{4}$/, '')}
                          tick={{ fontSize: 10.5, fill: '#98a2b3' }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          tickFormatter={(value) => compactNgn(Number(value))}
                          tick={{ fontSize: 10.5, fill: '#98a2b3' }}
                          axisLine={false}
                          tickLine={false}
                          width={54}
                        />
                        <Tooltip
                          formatter={(value) => [formatNgn(Number(value)), 'Volume']}
                          labelFormatter={(label) => formatDateShort(String(label))}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #e6eaf2',
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="volumeNgn"
                          stroke="#12c9a7"
                          strokeWidth={2.5}
                          fill="url(#adminVolume)"
                          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={CreditCard}
                    title="No transactions yet"
                    description="Platform volume will appear after the first payment."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook health</CardTitle>
                <p className="text-[12px] text-muted">Inbound events and outbound deliveries</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center gap-2">
                    <Webhook className="size-4 text-brand-600" />
                    <p className="text-[12px] font-semibold text-navy-900">Inbound events</p>
                    <Badge variant="neutral" className="ml-auto">
                      {data.webhooks.received}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 py-1.5">
                      <p className="text-[13px] font-bold text-emerald-700">{data.webhooks.processed}</p>
                      <p className="text-[9.5px] text-emerald-600">Processed</p>
                    </div>
                    <div className="rounded-lg bg-red-50 py-1.5">
                      <p className="text-[13px] font-bold text-red-600">{data.webhooks.failed}</p>
                      <p className="text-[9.5px] text-red-500">Failed</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="text-[13px] font-bold text-slate-600">{data.webhooks.ignored}</p>
                      <p className="text-[9.5px] text-slate-500">Ignored</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="size-4 text-accent-600" />
                    <p className="text-[12px] font-semibold text-navy-900">Outbound deliveries</p>
                    <Badge variant="neutral" className="ml-auto">
                      {data.deliveries.total}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        Delivered
                      </span>
                      <span className="font-semibold text-navy-900">{data.deliveries.success}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <XCircle className="size-3 text-red-500" />
                        Failed
                      </span>
                      <span className="font-semibold text-navy-900">{data.deliveries.failed}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="size-3 text-amber-500" />
                        Pending
                      </span>
                      <span className="font-semibold text-navy-900">{data.deliveries.pending}</span>
                    </div>
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/admin/webhooks">
                    Inspect webhooks
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent transactions</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/transactions">
                    View all
                    <ArrowRight />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                <TransactionsTable items={data.recentTransactions} basePath="/admin/transactions" compact />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent activity</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/audit-logs">
                    Audit log
                    <ArrowRight />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentAudit.length > 0 ? (
                  data.recentAudit.slice(0, 7).map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-400" />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-medium text-navy-900">
                          {log.action}
                        </p>
                        <p className="truncate text-[10.5px] text-muted">
                          {log.actorEmail ?? 'System'} · {formatTimeAgo(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-[12px] text-muted">No audit activity yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Skeleton className="h-64 w-full rounded-2xl" />
      )}

      {query.isLoading ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableSkeleton rows={4} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
