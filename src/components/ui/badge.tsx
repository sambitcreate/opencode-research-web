import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClasses = {
  default: 'border-[var(--border-weak)] bg-[var(--surface-base)] text-[var(--text-base)]',
  success: 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'border-[var(--critical-border)] bg-[var(--critical-soft)] text-[var(--critical)]'
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
