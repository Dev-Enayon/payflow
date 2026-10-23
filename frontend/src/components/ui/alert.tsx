import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const tones = {
  info: { wrapper: 'border-sky-100 bg-sky-50 text-sky-900', icon: Info, iconClass: 'text-sky-600' },
  success: {
    wrapper: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  warning: {
    wrapper: 'border-amber-100 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  danger: { wrapper: 'border-red-100 bg-red-50 text-red-900', icon: XCircle, iconClass: 'text-red-600' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const config = tones[tone];
  const Icon = config.icon;
  return (
    <div className={cn('flex gap-3 rounded-xl border p-3.5 text-[13px]', config.wrapper, className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', config.iconClass)} />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('leading-relaxed', title && 'mt-0.5 opacity-90')}>{children}</div> : null}
      </div>
    </div>
  );
}
