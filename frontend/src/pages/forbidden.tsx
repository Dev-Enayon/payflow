import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { usePageTitle } from '@/hooks/use-page-title';

export default function ForbiddenPage() {
  usePageTitle('Access denied');
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
            <ShieldAlert className="size-6" />
          </span>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-600">Error 403</p>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.035em] text-navy-900">Access denied</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Your account does not have permission to view this area. Administrator routes require an
            administrator role, checked on the server.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft />
                Go to dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
