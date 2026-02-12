import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClasses = {
  default:
    'border-transparent bg-[var(--button-primary)] text-[var(--button-primary-foreground)] hover:bg-[var(--button-primary-hover)]',
  secondary:
    'border-transparent bg-[var(--button-secondary)] text-[var(--text-strong)] hover:bg-[var(--button-secondary-hover)] shadow-[var(--shadow-xs-border)]',
  outline:
    'border-[var(--border-weak)] bg-[var(--surface-raised)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]',
  ghost: 'border-transparent bg-transparent text-[var(--text-strong)] hover:bg-[var(--surface-hover)]',
  destructive: 'border-transparent bg-[var(--critical)] text-white hover:brightness-95'
} as const;

const sizeClasses = {
  default: 'h-10 px-5 py-2',
  sm: 'h-9 rounded-md px-3 text-[13px]',
  lg: 'h-11 rounded-md px-8',
  icon: 'size-10'
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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-[14px] font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/55',
          'disabled:pointer-events-none disabled:opacity-55',
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
