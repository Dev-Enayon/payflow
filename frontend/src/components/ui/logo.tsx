import { Link } from 'react-router-dom';
import { cn, BRAND_NAME } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 text-white shadow-[0_4px_12px_rgba(49,92,255,0.28)]',
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-[15px] font-extrabold leading-none tracking-tight">P</span>
      <span className="absolute -right-1 -top-1 size-3 rounded-full bg-white/25" />
    </span>
  );
}

export function Logo({
  className,
  to = '/',
  inverted = false,
  markClassName,
}: {
  className?: string;
  to?: string;
  inverted?: boolean;
  markClassName?: string;
}) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          'text-[17px] font-bold tracking-[-0.02em]',
          inverted ? 'text-white' : 'text-navy-900',
        )}
      >
        {BRAND_NAME}
      </span>
    </Link>
  );
}
