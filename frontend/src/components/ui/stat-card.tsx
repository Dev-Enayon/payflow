import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  change,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  icon: LucideIcon;
  tone?: 'brand' | 'accent' | 'amber' | 'slate';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-100 text-accent-700',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  const positive = (change ?? 0) > 0;
  const neutral = change === null || change === undefined || change === 0;
  const ChangeIcon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="group rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</p>
        <span className={cn('inline-flex size-9 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="size-[17px]" />
        </span>
      </div>
      <p className="mt-3 text-[26px] font-bold leading-none tracking-[-0.03em] text-navy-900">{value}</p>
      <div className="mt-3 flex items-center gap-1.5 text-[12px]">
        {change !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
              neutral && 'bg-slate-100 text-slate-500',
              !neutral && positive && 'bg-emerald-50 text-emerald-700',
              !neutral && !positive && 'bg-red-50 text-red-600',
            )}
          >
            <ChangeIcon className="size-3" />
            {neutral ? 'No change' : `${Math.abs(change).toFixed(1)}%`}
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
