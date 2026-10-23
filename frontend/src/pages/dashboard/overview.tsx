import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CreditCard,
  ExternalLink,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatsSkeleton, Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { TransactionsTable } from '@/components/dashboard/transactions-table';
import { useAuth } from '@/hooks/use-auth';
import { usePageTitle } from '@/hooks/use-page-title';
import { dashboardService } from '@/services/dashboard.service';
import { cn, formatDateShort, formatNgn, formatNumber } from '@/lib/utils';
import type { TransactionStatus } from '@/types';

const periods = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const statusColors: Record<TransactionStatus, string> = {
  SUCCESS: '#10b981',
  FAILED: '#ef4444',
  PENDING: '#f59e0b',
  INITIALIZED: '#0ea5e9',
  ABANDONED: '#94a3b8',
  REVERSED: '#f97316',
};

const statusLabels: Record<TransactionStatus, string> = {
  SUCCESS: 'Successful',
  FAILED: 'Failed',
  PENDING: 'Pending',
  INITIALIZED: 'Initialized',
  ABANDONED: 'Abandoned',
  REVERSED: 'Reversed',
};

function compactNgn(value: number): string {
  return `₦${new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)}`;
}

export default function DashboardOverviewPage() {
  usePageTitle('Overview');
  const { user } = useAuth();
  const [period, setPeriod] = useState(30);

  const query = useQuery({
    queryKey: ['dashboard', 'overview', period],
    queryFn: () => dashboardService.overview(period),
  });

  const data = query.data;
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const today = new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const totalStatusCount =
    data?.statusBreakdown.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`${today} · Here is what is happening with your payments.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/pay">
                <ExternalLink />
                Payment page
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard/transactions">
                <ReceiptText />
                Transactions
              </Link>
            </Button>
          </>
        }
      />

      {data?.mode === 'mock' ? (
        <Alert tone="warning" title="Mock gateway is active">
          Payments on this environment are simulated locally. Select an outcome on the mock checkout page
          to exercise the full lifecycle. No real money moves.
        </Alert>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-muted">Performance overview</p>
        <div className="inline-flex rounded-xl border border-border bg-white p-1">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition-colors',
                period === item.value
                  ? 'bg-navy-900 text-white'
                  : 'text-slate-500 hover:text-navy-900',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <StatsSkeleton />
      ) : query.error ? (
        <Alert tone="danger" title="Could not load your overview">
          {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Payment volume"
            value={formatNgn(data.metrics.volumeNgn)}
            change={data.metrics.volumeChangePct}
            hint={`vs previous ${period}d`}
            icon={Wallet}
          />
          <StatCard
            label="Successful payments"
            value={formatNumber(data.metrics.successfulPayments)}
            change={data.metrics.successfulChangePct}
            hint={`of ${formatNumber(data.metrics.totalPayments)} total`}
            icon={TrendingUp}
            tone="accent"
          />
          <StatCard
            label="Success rate"
            value={`${data.metrics.successRate}%`}
            change={Number((data.metrics.successRate - data.metrics.previousSuccessRate).toFixed(1))}
            hint={`prev. ${data.metrics.previousSuccessRate}%`}
            icon={CreditCard}
            tone="amber"
          />
          <StatCard
            label="Pending payments"
            value={formatNumber(data.metrics.pendingPayments)}
            hint="Awaiting provider confirmation"
            icon={Clock3}
            tone="slate"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Payment volume</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">Successful volume over the last {period} days</p>
            </div>
            {data ? (
              <div className="text-right">
                <p className="text-[15px] font-bold text-navy-900">{formatNgn(data.metrics.volumeNgn)}</p>
                <p className="text-[10.5px] text-muted">{data.metrics.successfulPayments} payments</p>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data && data.series.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#315cff" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#315cff" stopOpacity={0} />
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
                        boxShadow: '0 8px 24px rgba(16,24,40,0.08)',
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volumeNgn"
                      stroke="#315cff"
                      strokeWidth={2.5}
                      fill="url(#volumeFill)"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No payment data yet"
                description="Volume will appear here after your first successful payment."
                action={
                  <Button asChild size="sm">
                    <Link to="/pay">Open checkout</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <p className="text-[12px] text-muted">All transactions in the last {period} days</p>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data && totalStatusCount > 0 ? (
              <>
                <div className="relative mx-auto h-[190px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {data.statusBreakdown.map((item) => (
                          <Cell key={item.status} fill={statusColors[item.status] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} payments`,
                          statusLabels[name as TransactionStatus] ?? String(name),
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e6eaf2',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[20px] font-bold text-navy-900">{formatNumber(totalStatusCount)}</p>
                    <p className="text-[10px] text-muted">total</p>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {data.statusBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-[12px]">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: statusColors[item.status] ?? '#94a3b8' }}
                        />
                        {statusLabels[item.status] ?? item.status}
                      </span>
                      <span className="font-semibold text-navy-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="Nothing to break down"
                description="Transaction statuses will be summarised here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <p className="mt-0.5 text-[12px] text-muted">The latest activity in your workspace</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/transactions">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {query.isLoading ? (
            <TableSkeleton rows={5} />
          ) : data ? (
            <TransactionsTable items={data.recentTransactions} basePath="/dashboard/transactions" />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11.5px] text-muted">
        <p>
          Average successful payment:{' '}
          <span className="font-semibold text-navy-800">
            {data ? formatNgn(data.metrics.averagePaymentNgn) : '—'}
          </span>
        </p>
        <Link
          to="/dashboard/integration"
          className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
        >
          Integrate your store
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
