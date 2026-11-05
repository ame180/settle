import type { Ref } from 'react'
import { ArrowLeftRight, ChevronRight, PieChart } from 'lucide-react'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'

type SplitCardProps = {
  payer: { id: number; name: string }
  /** "You paid", "Anna paid". */
  payerText: string
  /** 1:1 flips who paid in place; groups open the editor to choose. */
  payerAction: { kind: 'switch'; onClick: () => void } | { kind: 'change'; onClick: () => void }
  splitLabel: string
  /** Shown in red under the split label when the split no longer adds up. */
  warning?: string
  onOpenSplit: () => void
  splitButtonRef?: Ref<HTMLButtonElement>
}

/** Who paid and how it's split, as one tappable card under the amount. */
export function SplitCard({
  payer,
  payerText,
  payerAction,
  splitLabel,
  warning,
  onOpenSplit,
  splitButtonRef,
}: SplitCardProps) {
  return (
    <div
      className={cn(
        'scroll-mt-4 scroll-mb-28 rounded-xl border border-border-strong',
        warning && 'border-negative',
      )}
    >
      <div className="flex min-h-15 items-center gap-3 border-b py-2 pr-2 pl-3.5">
        <PersonAvatar id={payer.id} name={payer.name} size="sm" />
        <span className="flex-1 truncate">{payerText}</span>
        <button
          type="button"
          onClick={payerAction.onClick}
          className="flex h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-[15px] font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {payerAction.kind === 'switch' && (
            <ArrowLeftRight className="size-4" aria-hidden="true" />
          )}
          {payerAction.kind === 'switch' ? 'Switch' : 'Change'}
          {payerAction.kind === 'switch' && <span className="sr-only">who paid</span>}
        </button>
      </div>
      <button
        ref={splitButtonRef}
        type="button"
        onClick={onOpenSplit}
        aria-describedby={warning ? 'split-card-warning' : undefined}
        className="flex min-h-15 w-full items-center gap-3 rounded-b-xl px-3.5 py-2.5 text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <PieChart className="size-5.5 shrink-0" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span>{splitLabel}</span>
          {warning && (
            <span id="split-card-warning" className="text-[13px] font-semibold text-negative">
              {warning}
            </span>
          )}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </div>
  )
}
