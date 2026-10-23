import { cn, getInitials } from '@/lib/utils';

export function Avatar({
  name,
  className,
  tone = 'brand',
}: {
  name: string;
  className?: string;
  tone?: 'brand' | 'navy' | 'accent';
}) {
  const tones = {
    brand: 'bg-brand-100 text-brand-700',
    navy: 'bg-navy-900 text-white',
    accent: 'bg-accent-100 text-accent-700',
  };
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {getInitials(name || '?')}
    </span>
  );
}
