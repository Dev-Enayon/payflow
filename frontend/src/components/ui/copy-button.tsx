import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function CopyButton({
  value,
  className,
  label,
  size = 'icon-sm',
  variant = 'ghost',
}: {
  value: string;
  className?: string;
  label?: string;
  size?: 'icon-sm' | 'icon' | 'sm';
  variant?: 'ghost' | 'outline' | 'secondary';
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('shrink-0', className)}
      aria-label="Copy to clipboard"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(label ?? 'Copied to clipboard');
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error('Could not copy. Select the value and copy manually.');
        }
      }}
    >
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      {size === 'sm' ? <span>{copied ? 'Copied' : 'Copy'}</span> : null}
    </Button>
  );
}
