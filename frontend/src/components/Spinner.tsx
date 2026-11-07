import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A centred loading spinner; `label` is read out by screen readers. */
export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn('flex justify-center text-muted-foreground', className)}>
      <LoaderCircle className="size-6 motion-safe:animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
