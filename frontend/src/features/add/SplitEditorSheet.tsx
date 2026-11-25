import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Check, ChevronDown, CircleCheck, Minus, Plus, TriangleAlert, X } from 'lucide-react'
import type { MeResponse, PersonRef, SplitType } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ownDisplayName } from '@/lib/person'
import {
  formatDecimal,
  formatGrosze,
  formatPln,
  formatAmountNumber,
  formatPlnRange,
  fromGrosze,
  currencyAffix,
  localizeAmountInput,
  parseAmountInput,
  sanitizeAmountInput,
  toGrosze,
} from '@/lib/money'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertLine } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import {
  checkSplit,
  editSplit,
  MAX_SHARES,
  splitDebts,
  switchSplitType,
  type SplitCheck,
  type SplitDraft,
} from './splitModel'

function getTabs(): { type: SplitType; label: string; hint: string }[] {
  return [
    { type: 'equal', label: t`Equal`, hint: t`Tick everyone who shares the cost.` },
    { type: 'exact', label: t`Amounts`, hint: t`Enter how much each person’s share is.` },
    { type: 'percentage', label: t`%`, hint: t`Percentages have to add up to 100.` },
    { type: 'shares', label: t`Shares`, hint: t`Whole numbers. 2 nights = 2 shares.` },
  ]
}

type Person = { id: number; name: string; avatarName: string }

type SplitEditorSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: MeResponse
  others: PersonRef[]
  total: string | null
  split: SplitDraft
  /** Opened from "Change" next to who paid: start with the payer list expanded. */
  payerListOpen: boolean
  onDone: (split: SplitDraft) => void
}

/**
 * Who paid, and Equal / Amounts / % / Shares. Edits a copy: Done applies it, closing or swiping
 * down drops it. Done stays disabled until the split adds up.
 */
export function SplitEditorSheet({
  open,
  onOpenChange,
  me,
  others,
  total,
  split,
  payerListOpen,
  onDone,
}: SplitEditorSheetProps) {
  // A fresh editor (and copy of the split) on every open; kept mounted while the sheet closes.
  const [session, setSession] = useState(open ? 1 : 0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((value) => value + 1)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <SheetContent className="h-[90dvh]">
        {session > 0 && (
          <SplitEditor
            key={session}
            me={me}
            others={others}
            total={total}
            initialSplit={split}
            initialPayerListOpen={payerListOpen}
            onCancel={() => onOpenChange(false)}
            onDone={onDone}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SplitEditor({
  me,
  others,
  total,
  initialSplit,
  initialPayerListOpen,
  onCancel,
  onDone,
}: {
  me: MeResponse
  others: PersonRef[]
  total: string | null
  initialSplit: SplitDraft
  initialPayerListOpen: boolean
  onCancel: () => void
  onDone: (split: SplitDraft) => void
}) {
  const { t } = useLingui()
  const [split, setSplit] = useState(initialSplit)
  const [payerListOpen, setPayerListOpen] = useState(initialPayerListOpen)
  const [focusedId, setFocusedId] = useState<number | null>(null)

  const people: Person[] = [
    { id: me.id, name: t`You`, avatarName: ownDisplayName(me) },
    ...others.map((person) => ({
      id: person.id,
      name: person.displayName,
      avatarName: person.displayName,
    })),
  ]
  const ids = people.map((person) => person.id)
  const check = checkSplit(split, ids, total, me.id)
  const canFinish = check.ok || check.problem.kind === 'no-amount'
  const payer = people.find((person) => person.id === split.payerId) ?? people[0]
  const tabs = getTabs()
  const tab = tabs.find((candidate) => candidate.type === split.type) ?? tabs[0]

  const totalLabel = total ? formatPln(total) : null

  function setValue(personId: number, value: string) {
    setSplit((current) => editSplit(current, { values: { ...current.values, [personId]: value } }))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-2 pt-1">
        <Button variant="ghost" size="icon" aria-label={t`Close`} onClick={onCancel}>
          <X aria-hidden="true" />
        </Button>
        <SheetTitle>{totalLabel ? t`Split ${totalLabel}` : t`Split`}</SheetTitle>
      </div>
      <SheetDescription className="sr-only">
        <Trans>Choose who paid and how the cost is shared.</Trans>
      </SheetDescription>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-4">
        <div className="rounded-xl border border-border-strong">
          <button
            type="button"
            aria-expanded={payerListOpen}
            onClick={() => setPayerListOpen((value) => !value)}
            className="flex h-14 w-full items-center gap-2.5 rounded-xl px-3.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="text-sm text-muted-foreground">
              <Trans>Paid by</Trans>
            </span>
            <PersonAvatar id={payer.id} name={payer.avatarName} size="sm" />
            <span className="flex-1 truncate font-semibold">{payer.name}</span>
            <ChevronDown
              className={cn('size-5 text-muted-foreground', payerListOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          {payerListOpen && (
            <div role="radiogroup" aria-label={t`Who paid`} className="border-t">
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  role="radio"
                  aria-checked={person.id === split.payerId}
                  onClick={() => {
                    setSplit((current) => ({ ...current, payerId: person.id }))
                    setPayerListOpen(false)
                  }}
                  className="flex min-h-13 w-full items-center gap-3 border-b px-3.5 text-left last:border-b-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border-2 border-border-strong',
                      person.id === split.payerId && 'border-foreground',
                    )}
                  >
                    {person.id === split.payerId && (
                      <span className="size-2.5 rounded-full bg-foreground" />
                    )}
                  </span>
                  <PersonAvatar id={person.id} name={person.avatarName} size="sm" />
                  <span className="truncate">{person.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t`Split type`}
          className="grid grid-cols-4 rounded-full bg-secondary p-1"
        >
          {tabs.map((candidate) => (
            <button
              key={candidate.type}
              type="button"
              role="tab"
              id={`split-tab-${candidate.type}`}
              aria-controls="split-tab-panel"
              aria-selected={candidate.type === split.type}
              aria-label={candidate.type === 'percentage' ? t`Percentages` : undefined}
              onClick={() =>
                setSplit((current) => switchSplitType(current, candidate.type, ids, total))
              }
              className={cn(
                'h-10 rounded-full text-[15px] font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                candidate.type === split.type &&
                  'bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>

        <p className="-mt-1 text-[13px] text-muted-foreground">{tab.hint}</p>

        {!check.ok && check.problem.kind === 'not-involved' && (
          <AlertLine
            message={t`You need to pay or share in this expense. Tick yourself, or make yourself the payer.`}
          />
        )}

        <ul
          id="split-tab-panel"
          role="tabpanel"
          aria-labelledby={`split-tab-${split.type}`}
          className="-mt-1"
        >
          {people.map((person) => (
            <li
              key={person.id}
              className="flex min-h-16 items-center gap-3 border-b py-2.5 last:border-b-0"
            >
              <PersonAvatar id={person.id} name={person.avatarName} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{person.name}</span>
                <RowNote
                  split={split}
                  check={check}
                  personId={person.id}
                  total={total}
                  focused={focusedId === person.id}
                  onFill={(value) => setValue(person.id, value)}
                />
              </span>
              <RowControl
                split={split}
                person={person}
                onToggle={(included) =>
                  setSplit((current) =>
                    editSplit(current, {
                      excluded: included
                        ? current.excluded.filter((id) => id !== person.id)
                        : [...current.excluded, person.id],
                    }),
                  )
                }
                onValue={(value) => setValue(person.id, value)}
                onFocus={() => setFocusedId(person.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3 border-t px-4 pt-3 pb-4">
        <Status split={split} check={check} ids={ids} total={total} />
        <button
          type="button"
          disabled={!canFinish}
          onClick={() => onDone(split)}
          className="h-12 shrink-0 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:bg-secondary disabled:text-muted-foreground"
        >
          <Trans>Done</Trans>
        </button>
      </div>
    </div>
  )
}

function RowControl({
  split,
  person,
  onToggle,
  onValue,
  onFocus,
}: {
  split: SplitDraft
  person: Person
  onToggle: (included: boolean) => void
  onValue: (value: string) => void
  onFocus: () => void
}) {
  const { t } = useLingui()
  const value = split.values[person.id] ?? ''
  const personName = person.name

  if (split.type === 'equal') {
    const included = !split.excluded.includes(person.id)
    return (
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={included}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={t`${personName} shares the cost`}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-md border-2 border-border-strong peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
            included && 'border-foreground bg-foreground text-background',
          )}
        >
          {included && <Check className="size-4" strokeWidth={3} />}
        </span>
      </label>
    )
  }

  if (split.type === 'shares') {
    // Loaded expenses may carry fractional shares ("1.50"); stepping lands on whole numbers.
    const parsed = parseAmountInput(value) ?? '0.00'
    const shares = Number.parseInt(parsed, 10)
    const fractional = !parsed.endsWith('.00')
    const shareCount = Number(parsed)
    const step = (delta: number) => {
      const next = delta > 0 ? shares + 1 : fractional ? shares : shares - 1
      onValue(String(Math.min(MAX_SHARES, Math.max(0, next))))
    }
    return (
      <span className="flex h-11 shrink-0 items-center rounded-full border border-border-strong">
        <button
          type="button"
          aria-label={t`One share less for ${personName}`}
          disabled={shares === 0 && !fractional}
          onClick={() => step(-1)}
          className="flex size-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:text-muted-foreground/50"
        >
          <Minus className="size-4.5" aria-hidden="true" />
        </button>
        <span aria-live="polite" className="min-w-6 px-0.5 text-center font-semibold tabular-nums">
          <span className="sr-only">
            {plural(shareCount, {
              one: `${personName}: # share`,
              other: `${personName}: # shares`,
            })}
          </span>
          <span aria-hidden="true">{formatDecimal(parsed)}</span>
        </span>
        <button
          type="button"
          aria-label={t`One share more for ${personName}`}
          disabled={shares === MAX_SHARES}
          onClick={() => step(1)}
          className="flex size-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:text-muted-foreground/50"
        >
          <Plus className="size-4.5" aria-hidden="true" />
        </button>
      </span>
    )
  }

  const isPercent = split.type === 'percentage'
  const affix = isPercent ? { symbol: '%', position: 'after' as const } : currencyAffix('PLN')
  const symbol = <span className="w-5 text-[15px] text-muted-foreground">{affix.symbol}</span>
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {affix.position === 'before' && symbol}
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={isPercent ? '0' : localizeAmountInput('0.00')}
        aria-label={isPercent ? t`${personName}, percent` : t`${personName}, amount in zł`}
        value={localizeAmountInput(value)}
        onFocus={onFocus}
        onChange={(event) => onValue(sanitizeAmountInput(event.target.value, value))}
        className={cn('text-right tabular-nums', isPercent ? 'w-18' : 'w-24')}
      />
      {affix.position === 'after' && symbol}
    </span>
  )
}

function RowNote({
  split,
  check,
  personId,
  total,
  focused,
  onFill,
}: {
  split: SplitDraft
  check: SplitCheck
  personId: number
  total: string | null
  focused: boolean
  onFill: (value: string) => void
}) {
  if (split.type === 'exact') {
    if (!focused || check.ok || check.problem.kind !== 'amounts') {
      return null
    }
    const left = check.problem.total - check.problem.assigned
    if (left <= 0n) {
      return null
    }
    const current = toGrosze(parseAmountInput(split.values[personId] ?? '') ?? '0')
    const remaining = formatGrosze(left)
    return (
      <button
        type="button"
        // Keep the amount field focused so the link stays put while it's tapped.
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onFill(fromGrosze(current + left))}
        className="self-start text-[13px] font-semibold underline underline-offset-2"
      >
        <Trans>Fill the {remaining} left</Trans>
      </button>
    )
  }

  if (split.type === 'equal' && split.excluded.includes(personId)) {
    return (
      <span className="text-[13px] text-muted-foreground">
        <Trans>Not sharing</Trans>
      </span>
    )
  }
  if (!check.ok || total === null) {
    return null
  }

  return (
    <span className="text-[13px] text-muted-foreground tabular-nums">
      {formatGrosze(check.shares.get(personId) ?? 0n)}
    </span>
  )
}

function Status({
  split,
  check,
  ids,
  total,
}: {
  split: SplitDraft
  check: SplitCheck
  ids: number[]
  total: string | null
}) {
  const status = describeStatus(split, check, ids, total)
  const Icon = status.tone === 'ok' ? CircleCheck : status.tone === 'warn' ? TriangleAlert : null

  return (
    <div aria-live="polite" className="flex min-w-0 flex-1 flex-col">
      <span
        className={cn(
          'flex items-center gap-1.5 font-semibold tabular-nums',
          status.tone === 'ok' && 'text-positive',
          status.tone === 'warn' && 'text-negative',
        )}
      >
        {Icon && <Icon className="size-4.5 shrink-0" aria-hidden="true" />}
        {status.main}
      </span>
      <span className="text-[13px] text-muted-foreground">{status.sub}</span>
    </div>
  )
}

type StatusText = { tone: 'ok' | 'warn' | 'plain'; main: string; sub: string }

function describeStatus(
  split: SplitDraft,
  check: SplitCheck,
  ids: number[],
  total: string | null,
): StatusText {
  if (!check.ok && check.problem.kind === 'invalid-value') {
    return { tone: 'warn', main: t`Check the numbers`, sub: t`Use digits, with up to 2 decimals` }
  }
  if (!check.ok && check.problem.kind === 'not-involved') {
    return { tone: 'warn', main: t`You’re not in it`, sub: t`Tick yourself or pay` }
  }

  const debts = splitDebts(split, ids)
  const debtList = Array.isArray(debts) ? debts : []
  const noAmount = !check.ok && check.problem.kind === 'no-amount'

  if (split.type === 'equal') {
    const sharing = debtList.length
    const peopleCount = ids.length
    const sharingLabel = plural(peopleCount, {
      one: `${sharing} of # person sharing`,
      other: `${sharing} of # people sharing`,
    })
    if (sharing === 0) {
      return { tone: 'warn', main: t`Nobody is sharing`, sub: t`Tick at least one person` }
    }
    if (!check.ok) {
      return { tone: 'plain', main: sharingLabel, sub: t`Enter the amount to see each share` }
    }
    const shares = [...check.shares.values()]
    const min = shares.reduce((a, b) => (b < a ? b : a))
    const max = shares.reduce((a, b) => (b > a ? b : a))
    const each = min === max ? formatGrosze(min) : formatPlnRange(fromGrosze(min), fromGrosze(max))
    return { tone: 'ok', main: t`${each} each`, sub: sharingLabel }
  }

  if (split.type === 'shares') {
    // In hundredths of a share, since loaded expenses may have fractional shares.
    const count = debtList.reduce((sum, debt) => sum + toGrosze(debt.value ?? '0'), 0n)
    const shareCount = Number(count) / 100
    const label = plural(shareCount, { one: '# share', other: '# shares' })
    if (count === 0n) {
      return { tone: 'warn', main: t`No shares yet`, sub: t`Add at least one share` }
    }
    if (!check.ok || total === null) {
      return { tone: 'plain', main: label, sub: t`Enter the amount to see each share` }
    }
    const totalGrosze = toGrosze(total)
    const perShare = (totalGrosze * 100n) / count
    const exact = (totalGrosze * 100n) % count === 0n
    const perShareLabel = formatGrosze(perShare)
    return {
      tone: 'ok',
      main: label,
      sub: exact ? t`${perShareLabel} per share` : t`about ${perShareLabel} per share`,
    }
  }

  if (split.type === 'percentage') {
    if (!check.ok && check.problem.kind === 'percent') {
      const assigned = check.problem.assigned
      const difference = 10000n - assigned
      const assignedPercent = formatDecimal(fromGrosze(assigned))
      const differencePercent = formatDecimal(
        fromGrosze(difference > 0n ? difference : -difference),
      )
      return {
        tone: 'warn',
        main: t`${assignedPercent}% of 100%`,
        sub:
          difference > 0n
            ? t`${differencePercent}% left to assign`
            : t`${differencePercent}% too much`,
      }
    }
    if (!check.ok && check.problem.kind === 'nobody') {
      return { tone: 'warn', main: t`0% of 100%`, sub: t`Give someone a share` }
    }
    const totalLabel = total === null ? null : formatPln(total)
    return {
      tone: 'ok',
      main: '100%',
      sub: noAmount || totalLabel === null ? t`Adds up` : t`Adds up to ${totalLabel}`,
    }
  }

  // Amounts
  const assigned = debtList.reduce((sum, debt) => sum + toGrosze(debt.value ?? '0'), 0n)
  if (total === null) {
    const assignedLabel = formatGrosze(assigned)
    return {
      tone: 'plain',
      main: t`${assignedLabel} assigned`,
      sub: t`Enter the amount to check it adds up`,
    }
  }
  const totalGrosze = toGrosze(total)
  if (check.ok) {
    return { tone: 'ok', main: formatGrosze(totalGrosze), sub: t`All of it assigned` }
  }
  const difference = totalGrosze - assigned
  const assignedNumber = formatAmountNumber(fromGrosze(assigned))
  const totalAmount = formatGrosze(totalGrosze)
  const differenceAmount = formatGrosze(difference > 0n ? difference : -difference)
  return {
    tone: 'warn',
    main: t`${assignedNumber} of ${totalAmount}`,
    sub: difference > 0n ? t`${differenceAmount} left to assign` : t`${differenceAmount} too much`,
  }
}
