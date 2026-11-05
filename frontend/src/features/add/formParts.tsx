import type * as React from 'react'
import { CircleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FieldError({
  id,
  message,
  className,
}: {
  id?: string
  message: string
  className?: string
}) {
  return (
    <p id={id} className={cn('flex items-start gap-1.5 text-[13px] text-destructive', className)}>
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

/** Rounded secondary button used for the date and note chips and sheet options. */
export function PillButton({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border-strong bg-background px-4 text-[15px] font-medium whitespace-nowrap transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-secondary disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export function CloseIcon() {
  return <X className="size-6" aria-hidden="true" />
}

/** The dark pill at the bottom of a form; shows a spinner and its pending label while saving. */
export function PrimaryButton({
  pending,
  pendingLabel,
  children,
  className,
  ...props
}: React.ComponentProps<'button'> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <button
      aria-disabled={pending || undefined}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary/85 disabled:opacity-50',
        pending && 'bg-primary/80',
        className,
      )}
      {...props}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-4.5 animate-spin rounded-full border-[2.5px] border-current border-r-transparent"
        />
      )}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  )
}
