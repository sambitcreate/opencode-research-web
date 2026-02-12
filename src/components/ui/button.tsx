import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClasses = {
  default:
    'border-[var(--button-primary)] bg-[var(--button-primary)] text-[var(--button-primary-foreground)] hover:bg-[var(--button-primary-hover)] hover:border-[var(--button-primary-hover)]',
  secondary:
    'border-[var(--border-base)] bg-[var(--button-secondary)] text-[var(--text-strong)] hover:bg-[var(--button-secondary-hover)] hover:border-[var(--border-strong)]',
  outline:
    'border-[var(--border-base)] bg-transparent text-[var(--text-base)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
  ghost: 'border-transparent bg-transparent text-[var(--text-base)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]',
  destructive: 'border-[var(--critical-border)] bg-[var(--critical)] text-black hover:brightness-90',
  accent: 'border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]'
} as const;

const sizeClasses = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3 text-[13px]',
  lg: 'h-10 px-6',
  icon: 'size-9'
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border text-[13px] font-medium transition-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-selected)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]',
          'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed',
          'active:translate-y-px',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
