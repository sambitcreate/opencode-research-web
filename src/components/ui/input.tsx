import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-[2px] border border-[var(--border-base)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-base)]',
        'placeholder:text-[var(--text-weaker)] focus-visible:outline-none focus-visible:border-[var(--border-selected)] focus-visible:ring-1 focus-visible:ring-[var(--border-selected)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'transition-none',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
