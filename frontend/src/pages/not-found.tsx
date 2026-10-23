import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/use-page-title';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-white text-slate-400">
          <Compass className="size-6" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Error 404</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.035em] text-navy-900">Page not found</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          The page you are looking for does not exist or may have moved. Check the address and try again.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/">
              <ArrowLeft />
              Back home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pay">Make a payment</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
