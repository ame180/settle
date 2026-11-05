import { Check, SlidersHorizontal } from 'lucide-react'
import type { PersonRef } from '@/api/types'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { formatGrosze, formatPln } from '@/lib/money'
import { getShortName } from '@/lib/person'
import { cn } from '@/lib/utils'
import { CloseIcon, IconButton } from './formParts'
import { checkSplit, describeOutcome, type SplitDraft } from './splitModel'

type QuickSplitSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  meId: number
  other: PersonRef
  total: string | null
  split: SplitDraft
  onPick: (split: SplitDraft) => void
  onCustom: () => void
}

/** 1:1 only: the four common splits, applied on tap, plus a way into the full editor. */
export function QuickSplitSheet({
  open,
  onOpenChange,
  meId,
  other,
  total,
  split,
  onPick,
  onCustom,
}: QuickSplitSheetProps) {
  const name = getShortName(other.displayName)
  const people = [
    { id: meId, displayName: 'You' },
    { id: other.id, displayName: other.displayName },
  ]
  const options: { label: string; split: SplitDraft; fallback: string }[] = [
    {
      label: 'You paid, split equally',
      split: { payerId: meId, type: 'equal', excluded: [], values: {} },
      fallback: `${name} owes you half`,
    },
    {
      label: `You paid, ${name} owes it all`,
      split: { payerId: meId, type: 'equal', excluded: [meId], values: {} },
      fallback: `${name} owes you all of it`,
    },
    {
      label: `${name} paid, split equally`,
      split: { payerId: other.id, type: 'equal', excluded: [], values: {} },
      fallback: `You owe ${name} half`,
    },
    {
      label: `${name} paid, you owe it all`,
      split: { payerId: other.id, type: 'equal', excluded: [other.id], values: {} },
      fallback: `You owe ${name} all of it`,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex items-center gap-1 px-2 pt-1">
          <IconButton aria-label="Close" onClick={() => onOpenChange(false)}>
            <CloseIcon />
          </IconButton>
          <SheetTitle>{total ? `Split ${formatPln(total)}` : 'Split'}</SheetTitle>
        </div>
        <SheetDescription className="px-4 pb-2 text-[15px]">
          Who paid, and who owes?
        </SheetDescription>
        <ul className="overflow-y-auto">
          {options.map((option) => {
            const selected = sameSplit(option.split, split)
            const check = checkSplit(option.split, [meId, other.id], total, meId)
            const outcome = check.ok
              ? describeOutcome(check.shares, option.split.payerId, people, meId)
              : null
            return (
              <li key={option.label}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(option.split)}
                  className={cn(
                    'flex min-h-16 w-full items-center gap-3 border-t px-4 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
                    selected && 'bg-subtle',
                  )}
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-[15px] text-muted-foreground">
                      {outcome ? (
                        <>
                          {outcome.lead}{' '}
                          <span
                            className={cn(
                              'font-semibold',
                              outcome.tone === 'positive' ? 'text-positive' : 'text-negative',
                            )}
                          >
                            {formatGrosze(outcome.grosze)}
                          </span>
                        </>
                      ) : (
                        option.fallback
                      )}
                    </span>
                  </span>
                  {selected && <Check className="size-5.5 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t px-4 pt-3 pb-4">
          <button
            type="button"
            onClick={onCustom}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border-strong text-base font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <SlidersHorizontal className="size-4.5" aria-hidden="true" />
            Custom split: amounts, %, shares
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function sameSplit(a: SplitDraft, b: SplitDraft): boolean {
  return (
    a.type === b.type &&
    a.payerId === b.payerId &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((id) => b.excluded.includes(id))
  )
}
