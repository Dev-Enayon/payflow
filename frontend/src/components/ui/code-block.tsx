import { CopyButton } from './copy-button';
import { cn } from '@/lib/utils';

export function CodeBlock({
  code,
  language,
  filename,
  className,
  dark = true,
}: {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        dark ? 'border-navy-700 bg-navy-900' : 'border-border bg-canvas',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b px-4 py-2.5',
          dark ? 'border-white/10' : 'border-border',
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', dark ? 'text-slate-300' : 'text-slate-600')}>
            {filename ?? language ?? 'Request'}
          </span>
          {language && filename ? (
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                dark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-600',
              )}
            >
              {language}
            </span>
          ) : null}
        </div>
        <CopyButton
          value={code}
          label="Code copied"
          className={dark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : ''}
        />
      </div>
      <pre className={cn('overflow-x-auto p-4 text-[12.5px] leading-relaxed', dark ? 'text-slate-100' : 'text-navy-800')}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
