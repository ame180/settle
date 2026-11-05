import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useContacts } from '@/api/contacts'
import { useCreateExpense, useUpdateExpense } from '@/api/expenses'
import type { ExpenseRequest, MeResponse } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import { categoryInfo } from '@/lib/categories'
import { formatGrosze, formatPln } from '@/lib/money'
import { getShortName } from '@/lib/person'
import { cn } from '@/lib/utils'
import { AmountField } from './AmountField'
import { CategorySheet } from './CategorySheet'
import { guessCategory } from './categoryGuess'
import { DateNoteFields } from './DateNoteFields'
import {
  buildExpenseRequest,
  draftTotal,
  expenseFieldOrder,
  fieldForPath,
  peopleIds,
  splitError,
  type ExpenseDraft,
  type ExpenseField,
  type FieldErrors,
} from './expenseDraft'
import { FieldError, FormFooter, PrimaryButton } from './formParts'
import { PeopleField } from './PeopleField'
import { QuickSplitSheet } from './QuickSplitSheet'
import { describeSaveError } from './saveErrors'
import { SplitCard } from './SplitCard'
import { SplitEditorSheet } from './SplitEditorSheet'
import {
  checkSplit,
  describeOutcome,
  describeSplit,
  joinNames,
  mirrorSplit,
  prunePeople,
  type SplitCheck,
  type SplitDraft,
} from './splitModel'

type ExpenseFormProps = {
  me: MeResponse
  draft: ExpenseDraft
  onDraftChange: (update: (draft: ExpenseDraft) => ExpenseDraft) => void
  mode: { kind: 'create' } | { kind: 'edit'; expenseId: number }
  initialFocus?: 'people' | 'title'
  /** Rendered at the top of the scrolling area (the Expense | Payment tabs). */
  top?: ReactNode
  /** Called after a successful save with the confirmation to show. */
  onSaved: (message: string) => void
}

type OpenSheet = 'category' | 'quick-split' | 'editor' | null

export function ExpenseForm({
  me,
  draft,
  onDraftChange,
  mode,
  initialFocus,
  top,
  onSaved,
}: ExpenseFormProps) {
  const { data: contacts } = useContacts()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense(mode.kind === 'edit' ? mode.expenseId : 0)
  const mutation = mode.kind === 'edit' ? updateExpense : createExpense

  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  // Opening on the people field shows its list straight away.
  const [peopleOpen, setPeopleOpen] = useState(initialFocus === 'people')
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null)
  const [editorPayerOpen, setEditorPayerOpen] = useState(false)

  const peopleInputRef = useRef<HTMLInputElement>(null)
  const peopleBlockRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const splitButtonRef = useRef<HTMLButtonElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialFocus === 'title') {
      titleRef.current?.focus()
    } else if (initialFocus === 'people') {
      peopleInputRef.current?.focus()
    }
  }, [initialFocus])

  const ids = peopleIds(draft, me.id)
  const total = draftTotal(draft)
  const check = checkSplit(draft.split, ids, total, me.id)
  const people = [{ id: me.id, displayName: 'You' }, ...draft.others]
  const isOneToOne = draft.others.length === 1
  const pending = mutation.isPending

  function update(field: ExpenseField | null, change: (draft: ExpenseDraft) => ExpenseDraft) {
    onDraftChange(change)
    setServerError(null)
    // A split error can go stale when the amount or the people change, not only the split.
    const cleared: ExpenseField[] =
      field === null ? [] : field === 'amount' || field === 'people' ? [field, 'split'] : [field]
    if (cleared.some((name) => errors[name])) {
      setErrors((current) => {
        const next = { ...current }
        cleared.forEach((name) => delete next[name])
        return next
      })
    }
  }

  function setSplit(split: SplitDraft) {
    update('split', (current) => ({ ...current, split }))
  }

  function focusField(field: ExpenseField) {
    if (field === 'people') {
      peopleBlockRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    const target = {
      title: titleRef.current,
      amount: amountRef.current,
      split: splitButtonRef.current,
      note: noteRef.current,
      date: null,
    }[field]
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function showErrors(fieldErrors: FieldErrors) {
    setErrors(fieldErrors)
    const first = expenseFieldOrder.find((field) => fieldErrors[field])
    if (first) {
      focusField(first)
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) {
      return
    }
    setServerError(null)
    const result = buildExpenseRequest(draft, me.id)
    if (!result.ok) {
      showErrors(result.errors)
      return
    }

    mutation.mutate(result.request, {
      onSuccess: () => onSaved(savedMessage(result.request, check, draft, me.id, mode.kind)),
      onError: (error) => {
        const { errors: fieldErrors, banner } = describeSaveError(
          error,
          fieldForPath,
          genericError(mode.kind),
        )
        if (Object.keys(fieldErrors).length > 0) {
          showErrors(fieldErrors)
        }
        setServerError(banner)
      },
    })
  }

  const payerIsMe = draft.split.payerId === me.id
  const payer = people.find((person) => person.id === draft.split.payerId) ?? people[0]
  const cardWarning = errors.split ?? splitError(draft, me.id) ?? undefined
  const submitLabel =
    mode.kind === 'edit'
      ? 'Save changes'
      : total
        ? `Add ${formatPln(total)} expense`
        : 'Add expense'

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset disabled={pending} className="flex flex-col gap-5 px-4 pt-4 pb-8">
          {top}

          <div ref={peopleBlockRef} className="scroll-mt-4">
            <PeopleField
              me={me}
              others={draft.others}
              onChange={(others) =>
                update('people', (current) => ({
                  ...current,
                  others,
                  split: prunePeople(
                    current.split,
                    [me.id, ...others.map((person) => person.id)],
                    me.id,
                  ),
                }))
              }
              contacts={contacts?.items}
              open={peopleOpen}
              onOpenChange={setPeopleOpen}
              error={errors.people}
              inputRef={peopleInputRef}
            />
          </div>

          {!peopleOpen && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="expense-title" className="text-sm font-medium">
                  What was it for?
                </label>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={`Category: ${categoryInfo[draft.category].label}. Change category`}
                    onClick={() => setOpenSheet('category')}
                    className="shrink-0 rounded-tile focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <CategoryTile category={draft.category} className="pointer-events-none" />
                  </button>
                  <input
                    ref={titleRef}
                    id="expense-title"
                    type="text"
                    autoComplete="off"
                    enterKeyHint="next"
                    maxLength={255}
                    placeholder="e.g. Pizza, Uber, Groceries"
                    value={draft.title}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'expense-title-error' : undefined}
                    onChange={(event) => {
                      const title = event.target.value
                      update('title', (current) => ({
                        ...current,
                        title,
                        category: current.categoryPicked
                          ? current.category
                          : (guessCategory(title) ?? 'general'),
                      }))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        amountRef.current?.focus()
                      }
                    }}
                    className={cn(
                      'h-11 min-w-0 flex-1 rounded-[10px] border border-border-strong bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-[3px] focus:ring-foreground/10',
                      errors.title && 'border-destructive ring-[3px] ring-destructive/15',
                    )}
                  />
                </div>
                {errors.title && (
                  <FieldError id="expense-title-error" message={errors.title} className="pl-14" />
                )}
              </div>

              <AmountField
                value={draft.amount}
                onChange={(amount) => update('amount', (current) => ({ ...current, amount }))}
                error={errors.amount}
                inputRef={amountRef}
                outcome={
                  errors.amount ? null : (
                    <div aria-live="polite">
                      <OutcomeLine draft={draft} check={check} people={people} meId={me.id} />
                    </div>
                  )
                }
              />

              {draft.others.length > 0 && (
                <SplitCard
                  payer={{
                    id: payer.id,
                    name: payerIsMe ? (me.name ?? me.email) : payer.displayName,
                  }}
                  payerText={payerIsMe ? 'You paid' : `${getShortName(payer.displayName)} paid`}
                  payerAction={
                    isOneToOne
                      ? {
                          kind: 'switch',
                          onClick: () =>
                            setSplit(mirrorSplit(draft.split, me.id, draft.others[0].id)),
                        }
                      : {
                          kind: 'change',
                          onClick: () => {
                            setEditorPayerOpen(true)
                            setOpenSheet('editor')
                          },
                        }
                  }
                  splitLabel={describeSplit(draft.split, people, me.id)}
                  warning={cardWarning}
                  onOpenSplit={() => {
                    setEditorPayerOpen(false)
                    setOpenSheet(isOneToOne ? 'quick-split' : 'editor')
                  }}
                  splitButtonRef={splitButtonRef}
                />
              )}
            </>
          )}

          {/* Hidden rather than unmounted, so an opened note stays open. */}
          <div hidden={peopleOpen} className="flex flex-col gap-5">
            <DateNoteFields
              idPrefix="expense"
              occurredOn={draft.occurredOn}
              onDateChange={(occurredOn) =>
                update('date', (current) => ({ ...current, occurredOn }))
              }
              dateError={errors.date}
              note={draft.note}
              onNoteChange={(note) => update('note', (current) => ({ ...current, note }))}
              noteError={errors.note}
              noteRef={noteRef}
            />
          </div>
        </fieldset>
      </div>

      <FormFooter serverError={serverError}>
        {mode.kind === 'edit' && draft.others.length > 0 && (
          <p className="text-center text-[13px] text-muted-foreground">
            {joinNames(draft.others.map((person) => getShortName(person.displayName)))} will see
            your changes.
          </p>
        )}
        <PrimaryButton
          type="submit"
          pending={pending}
          pendingLabel={mode.kind === 'edit' ? 'Saving…' : 'Adding…'}
        >
          {submitLabel}
        </PrimaryButton>
      </FormFooter>

      <CategorySheet
        open={openSheet === 'category'}
        onOpenChange={(open) => setOpenSheet(open ? 'category' : null)}
        value={draft.category}
        onPick={(category) => {
          update(null, (current) => ({ ...current, category, categoryPicked: true }))
          setOpenSheet(null)
        }}
      />
      {isOneToOne && (
        <QuickSplitSheet
          open={openSheet === 'quick-split'}
          onOpenChange={(open) => setOpenSheet(open ? 'quick-split' : null)}
          meId={me.id}
          other={draft.others[0]}
          total={total}
          split={draft.split}
          onPick={(split) => {
            setSplit(split)
            setOpenSheet(null)
          }}
          onCustom={() => setOpenSheet('editor')}
        />
      )}
      <SplitEditorSheet
        open={openSheet === 'editor'}
        onOpenChange={(open) => setOpenSheet(open ? 'editor' : null)}
        me={me}
        others={draft.others}
        total={total}
        split={draft.split}
        payerListOpen={editorPayerOpen}
        onDone={(split) => {
          setSplit(split)
          setOpenSheet(null)
        }}
      />
    </form>
  )
}

function OutcomeLine({
  draft,
  check,
  people,
  meId,
}: {
  draft: ExpenseDraft
  check: SplitCheck
  people: { id: number; displayName: string }[]
  meId: number
}) {
  if (draftTotal(draft) === null) {
    return <Hint>Enter an amount to see who owes what</Hint>
  }
  if (draft.others.length === 0) {
    return <Hint>Add who you split this with to see who owes what</Hint>
  }
  if (!check.ok) {
    const warning = {
      'not-involved': 'You’re not in this expense',
      nobody: 'Nobody shares this yet',
      'invalid-value': 'Check the split',
      amounts: 'Split doesn’t add up yet',
      percent: 'Split doesn’t add up yet',
      'no-amount': null,
    }[check.problem.kind]
    if (warning === null) {
      return <Hint>Enter an amount to see who owes what</Hint>
    }
    return (
      <p className="flex items-center justify-center gap-1.5 text-[15px] font-medium text-negative">
        <TriangleAlert className="size-4" aria-hidden="true" />
        {warning}
      </p>
    )
  }

  const outcome = describeOutcome(check.shares, draft.split.payerId, people, meId)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[15px] text-foreground/80">
        {outcome.lead}
        {outcome.tone !== 'neutral' && (
          <>
            {' '}
            <span
              className={cn(
                'font-semibold',
                outcome.tone === 'positive' ? 'text-positive' : 'text-negative',
              )}
            >
              {formatGrosze(outcome.grosze)}
            </span>
          </>
        )}
      </p>
      {outcome.detail && <p className="text-[13px] text-muted-foreground">{outcome.detail}</p>}
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted-foreground">{children}</p>
}

function genericError(mode: 'create' | 'edit'): string {
  return mode === 'edit'
    ? 'Couldn’t save your changes. Nothing was changed and your entries are still here. Try again.'
    : 'Couldn’t add the expense. Nothing was saved and your entries are still here. Try again.'
}

function savedMessage(
  request: ExpenseRequest,
  check: SplitCheck,
  draft: ExpenseDraft,
  meId: number,
  mode: 'create' | 'edit',
): string {
  if (mode === 'edit') {
    return 'Changes saved.'
  }
  if (!check.ok) {
    return `${request.title} added.`
  }
  const people = [{ id: meId, displayName: 'You' }, ...draft.others]
  const outcome = describeOutcome(check.shares, request.payeeId, people, meId)
  if (outcome.tone === 'neutral') {
    return `${request.title} added.`
  }

  return `${request.title} added. ${outcome.lead} ${formatGrosze(outcome.grosze)}.`
}
