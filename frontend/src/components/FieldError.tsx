import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FieldError({
  id,
  message,
  className,
}: {
  id?: string
  message: string | undefined
  className?: string
}) {
  return (
    <p id={id} className={cn('flex items-start gap-1.5 text-[13px] text-destructive', className)}>
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

/** A problem with the whole form or sheet, as a line of red text under what it's about. */
export function AlertLine({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn('flex items-start gap-2 text-[15px] text-destructive', className)}
    >
      <CircleAlert className="mt-0.5 size-4.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}
