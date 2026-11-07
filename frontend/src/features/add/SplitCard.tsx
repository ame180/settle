import { useRef, type KeyboardEvent, type Ref } from 'react'
import { ArrowLeftRight, ChevronRight, PieChart, TriangleAlert } from 'lucide-react'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'
import type { QuickChoice } from './splitModel'

type SplitCardProps = {
  payer: { id: number; name: string }
  /** "You" or the payer's short name; only the name truncates, "paid" stays. */
  payerName: string
  /** 1:1 flips who paid in place; groups open the editor to choose. */
  payerAction: { kind: 'switch'; onClick: () => void } | { kind: 'change'; onClick: () => void }
  split:
    | {
        kind: 'quick'
        choice: QuickChoice
        /** "By shares · You 2, Anna 1" while Custom is picked. */
        summary: string | null
        onChoose: (choice: Exclude<QuickChoice, 'custom'>) => void
      }
    | { kind: 'label'; label: string }
  /** Shown in red in the card when the split no longer adds up. */
  warning?: string
  onOpenSplit: () => void
  /** The control a split error sends focus to. */
  splitButtonRef?: Ref<HTMLButtonElement>
}

const choices: { value: QuickChoice; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'full', label: 'Full amount' },
  { value: 'custom', label: 'Custom' },
]

const warningId = 'split-card-warning'

/** Who paid and how it's split, as one card under the amount. */
export function SplitCard({
  payer,
  payerName,
  payerAction,
  split,
  warning,
  onOpenSplit,
  splitButtonRef,
}: SplitCardProps) {
  return (
    <div
      role="group"
      aria-label="Who paid and how to split"
      className={cn(
        'flex scroll-mt-4 scroll-mb-28 flex-col gap-2 rounded-xl border border-border-strong px-3 pt-2 pb-3',
        warning && 'border-negative',
      )}
    >
      <div className="flex min-h-11 items-center gap-2.5 pl-1">
        <PersonAvatar id={payer.id} name={payer.name} size="sm" />
        <span className="flex min-w-0 flex-1 whitespace-nowrap">
          <span className="min-w-0 truncate">{payerName}</span>
          <span className="shrink-0">&nbsp;paid</span>
        </span>
        <button
          type="button"
          onClick={payerAction.onClick}
          aria-label={`${payerAction.kind === 'switch' ? 'Switch' : 'Change'} who paid`}
          className="group flex h-11 shrink-0 items-center focus-visible:outline-none"
        >
          <span className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[15px] font-medium group-hover:bg-secondary group-focus-visible:ring-2 group-focus-visible:ring-ring">
            {payerAction.kind === 'switch' && (
              <ArrowLeftRight className="size-4" aria-hidden="true" />
            )}
            {payerAction.kind === 'switch' ? 'Switch' : 'Change'}
          </span>
        </button>
      </div>

      {split.kind === 'quick' ? (
        <QuickChoices
          choice={split.choice}
          onChoose={split.onChoose}
          onCustom={onOpenSplit}
          checkedRef={splitButtonRef}
          describedBy={warning ? warningId : undefined}
        />
      ) : (
        <button
          ref={splitButtonRef}
          type="button"
          onClick={onOpenSplit}
          className="-mx-1 flex min-h-11 items-center gap-2.5 rounded-lg px-1 text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PieChart className="size-6 shrink-0 p-px" aria-hidden="true" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span>{split.label}</span>
            {warning && <span className="sr-only">. </span>}
            {warning && <Warning message={warning} />}
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      )}

      {split.kind === 'quick' && (split.summary || warning) && (
        <button
          type="button"
          onClick={onOpenSplit}
          className="-mb-1.5 flex min-h-11 flex-col justify-center gap-1 rounded-md px-1 text-left text-[13px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="sr-only">Edit split: </span>
          {split.summary && <span className="text-muted-foreground">{split.summary}</span>}
          {warning && <Warning message={warning} />}
        </button>
      )}
    </div>
  )
}

function Warning({ message }: { message: string }) {
  return (
    <span
      id={warningId}
      className="flex items-start gap-1.5 text-[13px] font-semibold text-negative"
    >
      <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </span>
  )
}

function QuickChoices({
  choice,
  onChoose,
  onCustom,
  checkedRef,
  describedBy,
}: {
  choice: QuickChoice
  onChoose: (choice: Exclude<QuickChoice, 'custom'>) => void
  onCustom: () => void
  checkedRef?: Ref<HTMLButtonElement>
  describedBy?: string
}) {
  const groupRef = useRef<HTMLDivElement>(null)

  // Arrows move between the options and pick Equally or Full amount. Custom only takes focus,
  // since picking it opens the editor.
  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) {
      return
    }
    event.preventDefault()
    const next = (index + step + choices.length) % choices.length
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
    const value = choices[next].value
    if (value !== 'custom') {
      onChoose(value)
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="How to split"
      className="grid grid-cols-3 rounded-full bg-muted p-1"
    >
      {choices.map((option, index) => {
        const checked = option.value === choice
        const value = option.value
        return (
          <button
            key={value}
            ref={checked ? checkedRef : undefined}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-describedby={checked ? describedBy : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => (value === 'custom' ? onCustom() : onChoose(value))}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'flex h-10 min-w-0 items-center justify-center gap-0.5 rounded-full px-1.5 text-[15px] font-medium whitespace-nowrap text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              checked &&
                'bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
            )}
          >
            <span className="truncate">{option.label}</span>
            {value === 'custom' && (
              <ChevronRight className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}
