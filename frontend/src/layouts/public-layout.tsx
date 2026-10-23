import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { usePublicSettings } from '@/hooks/use-app-data';
import { BRAND_NAME } from '@/lib/utils';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Developers', href: '#developers' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const { data: settings } = usePublicSettings();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLink = (href: string) =>
    isHome ? (
      <a
        href={href}
        className="text-[13px] font-medium text-slate-600 transition-colors hover:text-navy-900"
      >
        {links.find((link) => link.href === href)?.label}
      </a>
    ) : (
      <Link
        to={`/${href}`}
        className="text-[13px] font-medium text-slate-600 transition-colors hover:text-navy-900"
      >
        {links.find((link) => link.href === href)?.label}
      </Link>
    );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">{links.map((link) => navLink(link.href))}</nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  Dashboard
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/pay">
                    Make a payment
                    <ArrowRight />
                  </Link>
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            className="rounded-lg p-2 text-slate-600 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {mobileOpen ? (
          <div className="border-t border-border bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {links.map((link) => (
                <div key={link.href}>{navLink(link.href)}</div>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                {user ? (
                  <Button asChild>
                    <Link to="/dashboard">Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/pay">Make a payment</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
              Secure payment infrastructure for {settings?.businessName ?? 'modern businesses'}. Verified
              server-side, reconciled automatically, built on Paystack.
            </p>
            <p className="mt-4 text-[12px] text-muted">
              Support:{' '}
              <a
                href={`mailto:${settings?.supportEmail ?? 'support@payflow.local'}`}
                className="font-medium text-brand-600 hover:underline"
              >
                {settings?.supportEmail ?? 'support@payflow.local'}
              </a>
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { label: 'Make a payment', to: '/pay' },
              { label: 'Dashboard', to: '/login' },
              { label: 'Integration', to: '/dashboard/integration' },
            ]}
          />
          <FooterColumn
            title="Developers"
            links={[
              { label: 'API keys', to: '/dashboard/api-keys' },
              { label: 'Webhooks', to: '/dashboard/webhooks' },
              { label: 'Security', to: '/#security' },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { label: 'Privacy', to: '/privacy' },
              { label: 'Terms', to: '/terms' },
              { label: 'Support', to: `mailto:${settings?.supportEmail ?? 'support@payflow.local'}` },
            ]}
          />
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-[12px] text-muted sm:flex-row sm:px-6">
            <p>
              © {new Date().getFullYear()} {settings?.businessName ?? BRAND_NAME}. All rights reserved.
            </p>
            <p className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent-500" />
              Payments processed securely by Paystack
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.to.startsWith('mailto:') ? (
              <a href={link.to} className="text-[13px] text-slate-600 hover:text-navy-900">
                {link.label}
              </a>
            ) : (
              <Link to={link.to} className="text-[13px] text-slate-600 hover:text-navy-900">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
