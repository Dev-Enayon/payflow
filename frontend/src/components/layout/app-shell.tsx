import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useHealth, usePublicSettings } from '@/hooks/use-app-data';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/ui/logo';

export type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

function ModeBadge() {
  const { data } = useHealth();
  if (!data) return null;
  const config =
    data.paystackMode === 'live'
      ? { label: 'Live mode', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
      : data.paystackMode === 'mock'
        ? { label: 'Mock gateway', className: 'border-violet-200 bg-violet-50 text-violet-700' }
        : { label: 'Test mode', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return (
    <span
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex',
        config.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function SidebarNav({
  groups,
  onNavigate,
  bottom,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
  bottom?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? groupIndex}>
            {group.label ? (
              <p className="mb-2 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'size-[17px] shrink-0',
                          isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600',
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {bottom}
    </div>
  );
}

export function AppShell({
  navGroups,
  workspaceLabel,
  workspaceTone = 'brand',
  homePath = '/dashboard',
}: {
  navGroups: NavGroup[];
  workspaceLabel: string;
  workspaceTone?: 'brand' | 'navy';
  homePath?: string;
}) {
  const { user, logout } = useAuth();
  const { data: settings } = usePublicSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const activeTitle = useMemo(() => {
    const items = navGroups.flatMap((group) => group.items);
    const matched = items
      .filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return matched?.label ?? workspaceLabel;
  }, [location.pathname, navGroups, workspaceLabel]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      navigate(workspaceTone === 'navy' ? '/admin/login' : '/login');
    } finally {
      setSigningOut(false);
    }
  }

  const sidebarFooter = (
    <div className="border-t border-border px-3 py-3">
      <div className="rounded-xl bg-canvas p-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-navy-800">
          <ShieldCheck className="size-4 text-accent-600" />
          Secure by default
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Every payment is verified server-side with Paystack.
        </p>
        {settings?.supportEmail ? (
          <a
            href={`mailto:${settings.supportEmail}`}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
          >
            Contact support
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Logo to={homePath} />
        </div>
        <div className="px-4 pt-4">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold',
              workspaceTone === 'navy'
                ? 'border-navy-800 bg-navy-900 text-white'
                : 'border-border bg-canvas text-slate-600',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                workspaceTone === 'navy' ? 'bg-accent-400' : 'bg-brand-500',
              )}
            />
            {workspaceLabel}
          </div>
        </div>
        <SidebarNav groups={navGroups} bottom={sidebarFooter} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Logo to={homePath} />
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="px-4 pt-4">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold',
                  workspaceTone === 'navy'
                    ? 'border-navy-800 bg-navy-900 text-white'
                    : 'border-border bg-canvas text-slate-600',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    workspaceTone === 'navy' ? 'bg-accent-400' : 'bg-brand-500',
                  )}
                />
                {workspaceLabel}
              </div>
            </div>
            <SidebarNav groups={navGroups} onNavigate={() => setMobileOpen(false)} bottom={sidebarFooter} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-navy-900">{activeTitle}</p>
            <p className="hidden text-[11px] text-muted sm:block">
              {workspaceTone === 'navy' ? 'Platform administration' : 'Merchant workspace'}
            </p>
          </div>
          <ModeBadge />
          <Link
            to="/pay"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-navy-900 sm:inline-flex"
          >
            Payment page
            <ExternalLink className="size-3" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-slate-100"
                aria-label="Account menu"
              >
                <Avatar name={user?.name ?? 'User'} tone={workspaceTone === 'navy' ? 'navy' : 'brand'} />
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-navy-800 sm:block">
                  {user?.name}
                </span>
                <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p className="text-[13px] font-semibold text-navy-900">{user?.name}</p>
                <p className="mt-0.5 truncate text-[11px] font-normal text-muted">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`${homePath}/settings`)}>
                <Settings className="size-4 text-slate-400" />
                {workspaceTone === 'navy' ? 'Platform settings' : 'Account settings'}
              </DropdownMenuItem>
              {user?.role === 'ADMIN' ? (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <ShieldCheck className="size-4 text-slate-400" />
                  Admin console
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive disabled={signingOut} onClick={handleSignOut}>
                <LogOut className="size-4" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
