import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-[2px] border border-[var(--border-base)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-base)] font-mono',
        'placeholder:text-[var(--text-weaker)] focus-visible:outline-none focus-visible:border-[var(--border-selected)] focus-visible:ring-1 focus-visible:ring-[var(--border-selected)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'resize-none transition-none leading-relaxed',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
