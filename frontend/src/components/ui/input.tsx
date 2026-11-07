import type * as React from 'react'
import { cn } from '@/lib/utils'

const fieldClassName =
  'w-full min-w-0 rounded-[10px] border border-border-strong bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-[3px] focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15'

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClassName, 'h-11', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClassName, 'py-2.5', className)} {...props} />
}

export { Input, Textarea }
