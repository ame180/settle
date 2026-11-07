import type * as React from 'react'
import { cn } from '@/lib/utils'

type PrimaryButtonProps = React.ComponentProps<'button'> & {
  pending?: boolean
  pendingLabel?: string
}

/**
 * The dark full-width pill that saves a form. While `pending` it shows a spinner and its pending
 * label, ignores taps and Enter, and keeps focus (it isn't `disabled`, so focus doesn't jump).
 */
export function PrimaryButton({
  pending = false,
  pendingLabel,
  children,
  className,
  onClick,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      aria-disabled={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
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
          className="size-4.5 rounded-full border-[2.5px] border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      <span>{pending ? (pendingLabel ?? children) : children}</span>
    </button>
  )
}
