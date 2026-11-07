import type * as React from 'react'
import { cn } from '@/lib/utils'

/** A grey placeholder block that pulses while content loads. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded bg-muted motion-safe:animate-pulse', className)} {...props} />
}

export { Skeleton }
