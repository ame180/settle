import { useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { addDays, formatLongDate, fromIsoDate, todayIso, toIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { IconButton, PillButton } from './formParts'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type DateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (isoDate: string) => void
}

/**
 * Today / Yesterday shortcuts and a month grid. Future dates are allowed; picking one keeps
 * the sheet open to say it counts towards balances straight away.
 */
export function DateSheet({ open, onOpenChange, value, onChange }: DateSheetProps) {
  const today = todayIso()
  const [month, setMonth] = useState(() => startOfMonth(value))
  // Each time it opens, show the month of the picked date.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMonth(startOfMonth(value))
    }
  }
  const isFuture = value > today

  function pick(isoDate: string) {
    onChange(isoDate)
    if (isoDate <= today) {
      onOpenChange(false)
    }
  }

  const first = fromIsoDate(month)
  const leadingBlanks = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(first.getFullYear(), first.getMonth(), index + 1)),
  )
  const monthLabel = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-2 pb-5">
          <SheetTitle>Date</SheetTitle>
          <SheetDescription className="sr-only">Pick a date.</SheetDescription>
          <div className="flex gap-2">
            <PillButton aria-pressed={value === today} onClick={() => pick(today)}>
              Today
            </PillButton>
            <PillButton
              aria-pressed={value === addDays(today, -1)}
              onClick={() => pick(addDays(today, -1))}
            >
              Yesterday
            </PillButton>
          </div>
          <div className="flex items-center gap-1">
            <h3 id="date-sheet-month" className="flex-1 font-semibold">
              {monthLabel}
            </h3>
            <IconButton aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </IconButton>
            <IconButton aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
          <div
            role="group"
            aria-labelledby="date-sheet-month"
            className="grid grid-cols-7 justify-items-center gap-0.5"
          >
            {weekdays.map((weekday) => (
              <abbr
                key={weekday}
                title={weekday}
                className="h-6 text-xs font-medium text-muted-foreground no-underline"
              >
                {weekday[0]}
              </abbr>
            ))}
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}
            {days.map((isoDate) => {
              const selected = isoDate === value
              const isToday = isoDate === today
              return (
                <button
                  key={isoDate}
                  type="button"
                  aria-pressed={selected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${formatLongDate(isoDate)}${isToday ? ', today' : ''}`}
                  onClick={() => pick(isoDate)}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full text-[15px] tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isToday && !selected && 'border border-foreground font-semibold',
                    selected && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {fromIsoDate(isoDate).getDate()}
                </button>
              )
            })}
          </div>
          {isFuture && (
            <>
              <p
                role="status"
                className="flex items-start gap-2.5 rounded-[10px] bg-subtle px-3.5 py-3 text-[13px] text-foreground/80"
              >
                <Info className="mt-px size-4.5 shrink-0" aria-hidden="true" />
                <span>
                  {formatLongDate(value)} is in the future. It still counts towards your balances
                  straight away.
                </span>
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-12 rounded-full bg-primary text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Done
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

function shiftMonth(monthStart: string, months: number): string {
  const date = fromIsoDate(monthStart)
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + months, 1))
}
