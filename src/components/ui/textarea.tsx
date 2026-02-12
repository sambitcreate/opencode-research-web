import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[92px] w-full rounded-lg border border-[var(--border-base)] bg-[var(--input-bg)] px-3 py-2.5 text-[14px] text-[var(--text-base)]',
        'placeholder:text-[var(--text-weaker)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
