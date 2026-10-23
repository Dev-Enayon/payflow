import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { TransactionStatus } from '@/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-brand-100 bg-brand-50 text-brand-700',
        neutral: 'border-slate-200 bg-slate-50 text-slate-600',
        success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-100 bg-amber-50 text-amber-700',
        danger: 'border-red-100 bg-red-50 text-red-700',
        info: 'border-sky-100 bg-sky-50 text-sky-700',
        dark: 'border-white/15 bg-white/10 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const statusConfig: Record<
  TransactionStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']>; dot: string }
> = {
  SUCCESS: { label: 'Successful', variant: 'success', dot: 'bg-emerald-500' },
  FAILED: { label: 'Failed', variant: 'danger', dot: 'bg-red-500' },
  PENDING: { label: 'Pending', variant: 'warning', dot: 'bg-amber-500' },
  INITIALIZED: { label: 'Initialized', variant: 'info', dot: 'bg-sky-500' },
  ABANDONED: { label: 'Abandoned', variant: 'neutral', dot: 'bg-slate-400' },
  REVERSED: { label: 'Reversed', variant: 'warning', dot: 'bg-orange-500' },
};

export function StatusBadge({ status }: { status: TransactionStatus | string }) {
  const config = statusConfig[status as TransactionStatus] ?? {
    label: status,
    variant: 'neutral' as const,
    dot: 'bg-slate-400',
  };
  return (
    <Badge variant={config.variant}>
      <span className={cn('size-1.5 rounded-full', config.dot)} />
      {config.label}
    </Badge>
  );
}

const genericStatus: Record<string, { variant: NonNullable<BadgeProps['variant']>; dot: string }> = {
  SUCCESS: { variant: 'success', dot: 'bg-emerald-500' },
  PROCESSED: { variant: 'success', dot: 'bg-emerald-500' },
  FAILED: { variant: 'danger', dot: 'bg-red-500' },
  PENDING: { variant: 'warning', dot: 'bg-amber-500' },
  RECEIVED: { variant: 'info', dot: 'bg-sky-500' },
  IGNORED: { variant: 'neutral', dot: 'bg-slate-400' },
};

export function RecordStatusBadge({ status }: { status: string }) {
  const config = genericStatus[status] ?? { variant: 'neutral' as const, dot: 'bg-slate-400' };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <Badge variant={config.variant}>
      <span className={cn('size-1.5 rounded-full', config.dot)} />
      {label}
    </Badge>
  );
}
