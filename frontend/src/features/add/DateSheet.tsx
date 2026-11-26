import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  addDays,
  calendarWeekdays,
  formatLongDate,
  formatMonthYear,
  fromIsoDate,
  todayIso,
  toIsoDate,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { repeatChoiceLabel, repeatChoices, type RepeatChoice } from '@/lib/repeat'
import { Button } from '@/components/ui/button'

type DateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (isoDate: string) => void
  /** Adds the repeat choices; the sheet then stays open until Done. */
  repeat?: { value: RepeatChoice; onChange: (repeat: RepeatChoice) => void }
}

/**
 * Today / Yesterday shortcuts and a month grid. Future dates are allowed; picking one keeps
 * the sheet open to say it counts towards balances straight away.
 */
export function DateSheet({ open, onOpenChange, value, onChange, repeat }: DateSheetProps) {
  const { t } = useLingui()
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
  const futureDate = formatLongDate(value)

  function pick(isoDate: string) {
    onChange(isoDate)
    setMonth(startOfMonth(isoDate))
    if (isoDate <= today && !repeat) {
      onOpenChange(false)
    }
  }

  const first = fromIsoDate(month)
  const leadingBlanks = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(first.getFullYear(), first.getMonth(), index + 1)),
  )
  const monthLabel = formatMonthYear(first)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-2 pb-5">
          <SheetTitle>
            <Trans>Date</Trans>
          </SheetTitle>
          <SheetDescription className="sr-only">
            <Trans>Pick a date.</Trans>
          </SheetDescription>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="pill"
              aria-pressed={value === today}
              onClick={() => pick(today)}
            >
              <Trans>Today</Trans>
            </Button>
            <Button
              variant="outline"
              size="pill"
              aria-pressed={value === addDays(today, -1)}
              onClick={() => pick(addDays(today, -1))}
            >
              <Trans>Yesterday</Trans>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <h3 id="date-sheet-month" className="flex-1 font-semibold">
              {monthLabel}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="[&_svg]:size-5"
              aria-label={t`Previous month`}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="[&_svg]:size-5"
              aria-label={t`Next month`}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div
            role="group"
            aria-labelledby="date-sheet-month"
            className="grid grid-cols-7 justify-items-center gap-0.5"
          >
            {calendarWeekdays().map((weekday) => (
              <abbr
                key={weekday.long}
                title={weekday.long}
                className="h-6 text-xs font-medium text-muted-foreground no-underline"
              >
                {weekday.narrow}
              </abbr>
            ))}
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}
            {days.map((isoDate) => {
              const selected = isoDate === value
              const isToday = isoDate === today
              const longDate = formatLongDate(isoDate)
              return (
                <button
                  key={isoDate}
                  type="button"
                  aria-pressed={selected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={isToday ? t`${longDate}, today` : longDate}
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
            <p role="status" className="flex items-start gap-2 text-[13px] text-foreground/80">
              <Info className="mt-px size-4 shrink-0" aria-hidden="true" />
              <span>
                <Trans>
                  {futureDate} is in the future. It still counts towards your balances straight
                  away.
                </Trans>
              </span>
            </p>
          )}
          {repeat && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <h3 id="date-sheet-repeat" className="text-sm font-medium">
                <Trans>Repeat</Trans>
              </h3>
              <div
                role="group"
                aria-labelledby="date-sheet-repeat"
                className="flex flex-wrap gap-2"
              >
                {repeatChoices.map((choice) => (
                  <Button
                    key={choice}
                    variant="outline"
                    size="pill"
                    aria-pressed={repeat.value === choice}
                    onClick={() => repeat.onChange(choice)}
                    className={pressedRepeatClassName}
                  >
                    {repeatChoiceLabel(choice)}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {(isFuture || repeat) && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 shrink-0 rounded-full bg-primary text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Trans>Done</Trans>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const pressedRepeatClassName =
  'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:active:bg-primary'

function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

function shiftMonth(monthStart: string, months: number): string {
  const date = fromIsoDate(monthStart)
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + months, 1))
}
