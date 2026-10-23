import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePageTitle } from '@/hooks/use-page-title';
import { adminService } from '@/services/admin.service';
import { formatDate, formatTimeAgo } from '@/lib/utils';

export default function AdminUsersPage() {
  usePageTitle('Users');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: adminService.users });

  const filtered = (query.data ?? []).filter((user) => {
    const term = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  });

  const admins = query.data?.filter((user) => user.role === 'ADMIN').length ?? 0;
  const merchants = query.data?.filter((user) => user.role === 'MERCHANT').length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Accounts with access to the merchant workspace or platform console."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Total users</p>
          <p className="mt-1.5 text-[22px] font-bold text-navy-900">{query.data?.length ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Administrators</p>
          <p className="mt-1.5 flex items-center gap-2 text-[22px] font-bold text-navy-900">
            {admins}
            <ShieldCheck className="size-4 text-brand-500" />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Merchants</p>
          <p className="mt-1.5 flex items-center gap-2 text-[22px] font-bold text-navy-900">
            {merchants}
            <UserRound className="size-4 text-slate-400" />
          </p>
        </Card>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Search by name, email or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </div>
        ) : query.error ? (
          <CardContent className="pt-5">
            <Alert tone="danger" title="Could not load users">
              {query.error instanceof Error ? query.error.message : 'Please refresh and try again.'}
            </Alert>
          </CardContent>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign in</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} tone={user.role === 'ADMIN' ? 'navy' : 'brand'} />
                      <div>
                        <p className="text-[12.5px] font-semibold text-navy-900">{user.name}</p>
                        <p className="text-[11px] text-muted">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'neutral'}>
                      {user.role === 'ADMIN' ? 'Administrator' : 'Merchant'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11.5px] text-muted">
                    {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-[11.5px] text-muted">
                    {formatDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Users}
            title="No users match"
            description={
              search ? 'Try a different search term.' : 'User accounts will appear here once created.'
            }
          />
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-muted">
        User creation and role assignment are managed outside the dashboard to keep privileged changes
        deliberate. Role enforcement always happens on the server.
      </p>
    </div>
  );
}
