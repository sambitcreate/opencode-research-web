import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClasses = {
  default: 'border-[var(--border-base)] bg-[var(--surface-base)] text-[var(--text-base)]',
  success: 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'border-[var(--critical-border)] bg-[var(--critical-soft)] text-[var(--critical)]',
  accent: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono transition-none leading-none',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
