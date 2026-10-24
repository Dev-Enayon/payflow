import { Link } from 'react-router-dom';
import { cn, BRAND_NAME } from '@/lib/utils';
import logoMark from '/favicon.svg';

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt=""
      aria-hidden="true"
      className={cn('size-9 shrink-0 rounded-[11px]', className)}
    />
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
