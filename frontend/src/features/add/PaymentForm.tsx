import { useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileText,
  Info,
  TriangleAlert,
} from 'lucide-react'
import { ApiError } from '@/api/client'
import { useContacts } from '@/api/contacts'
import { useCreateTransfer, useUpdateTransfer } from '@/api/transfers'
import type { MeResponse, PersonRef } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { formatDateLabel } from '@/lib/dates'
import { findPlnAmount, formatGrosze, formatPln, fromGrosze, toGrosze } from '@/lib/money'
import { getShortName } from '@/lib/person'
import { cn } from '@/lib/utils'
import { AmountField } from './AmountField'
import { ContactPickerSheet } from './ContactPickerSheet'
import { DateSheet } from './DateSheet'
import { amountError, amountTotal } from './expenseDraft'
import { FieldError, PillButton, PrimaryButton } from './formParts'
import { clearingPayer, describePayment, paymentEffect, type PaymentPayer } from './paymentModel'

/** The Payment tab, as typed. Person, amount, date and note carry over from the Expense tab. */
export type PaymentDraft = {
  person: PersonRef | null
  payer: PaymentPayer
  amount: string
  occurredOn: string
  note: string
}

type PaymentField = 'person' | 'amount' | 'date' | 'note'

type PaymentFormProps = {
  me: MeResponse
  draft: PaymentDraft
  onDraftChange: (update: (draft: PaymentDraft) => PaymentDraft) => void
  /** Edit keeps who paid whom (the API can't change it) and knows the payment's own effect. */
  mode:
    | { kind: 'create' }
    | { kind: 'edit'; transferId: number; original: { payer: PaymentPayer; amount: string } }
  top?: ReactNode
  onSaved: (message: string) => void
}

export function PaymentForm({ me, draft, onDraftChange, mode, top, onSaved }: PaymentFormProps) {
  const { data: contacts } = useContacts()
  const createTransfer = useCreateTransfer()
  const updateTransfer = useUpdateTransfer(mode.kind === 'edit' ? mode.transferId : 0)
  const pending = createTransfer.isPending || updateTransfer.isPending

  const [errors, setErrors] = useState<Partial<Record<PaymentField, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [openSheet, setOpenSheet] = useState<'person' | 'date' | null>(null)
  const [noteOpen, setNoteOpen] = useState(draft.note !== '')
  const amountRef = useRef<HTMLInputElement>(null)
  const personRef = useRef<HTMLButtonElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const editing = mode.kind === 'edit'
  const total = amountTotal(draft.amount)
  const person = draft.person
  const name = person ? getShortName(person.displayName) : ''

  // The balance before this payment: in edit mode the saved payment is already in it.
  const contact = contacts?.items.find((item) => item.person.id === person?.id)
  const currentBalance = contact ? toGrosze(findPlnAmount(contact.balances) ?? '0') : null
  const balance =
    currentBalance === null
      ? null
      : editing
        ? currentBalance - paymentEffect(mode.original.payer, toGrosze(mode.original.amount))
        : currentBalance
  const after =
    balance !== null && total !== null
      ? balance + paymentEffect(draft.payer, toGrosze(total))
      : null
  const outcome = balance !== null && after !== null ? describePayment(balance, after, name) : null
  const fullBalance =
    balance !== null && balance !== 0n ? (balance < 0n ? -balance : balance) : null
  const offerFullBalance =
    fullBalance !== null &&
    !editing &&
    draft.payer === clearingPayer(balance ?? 0n) &&
    (total === null || toGrosze(total) !== fullBalance)

  function update(field: PaymentField | null, change: (draft: PaymentDraft) => PaymentDraft) {
    onDraftChange(change)
    setServerError(null)
    if (field && errors[field]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function showErrors(fieldErrors: Partial<Record<PaymentField, string>>) {
    setErrors(fieldErrors)
    const target = fieldErrors.person
      ? personRef.current
      : fieldErrors.amount
        ? amountRef.current
        : fieldErrors.note
          ? noteRef.current
          : null
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) {
      return
    }
    setServerError(null)
    const fieldErrors: Partial<Record<PaymentField, string>> = {}
    if (!person) {
      fieldErrors.person = draft.payer === 'me' ? 'Choose who you paid' : 'Choose who paid you'
    }
    const amountProblem = amountError(draft.amount)
    if (amountProblem) {
      fieldErrors.amount = amountProblem
    }
    if (!person || total === null || amountProblem) {
      showErrors(fieldErrors)
      return
    }

    const description = draft.note.trim() === '' ? null : draft.note.trim()
    const handlers = {
      onSuccess: () => {
        if (editing) {
          onSaved('Changes saved.')
        } else if (after === 0n) {
          onSaved(`Payment recorded. You and ${name} are settled up.`)
        } else {
          onSaved(`${formatPln(total)} payment recorded.`)
        }
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
          const placed: Partial<Record<PaymentField, string>> = {}
          const unplaced: string[] = []
          for (const violation of error.violations) {
            const field = paymentFieldForPath(violation.propertyPath)
            if (field) {
              placed[field] ??= violation.title
            } else {
              unplaced.push(violation.title)
            }
          }
          if (Object.keys(placed).length > 0) {
            showErrors(placed)
            setServerError(unplaced[0] ?? null)
            return
          }
          setServerError(unplaced[0] ?? error.detail ?? genericError(editing))
          return
        }
        setServerError(genericError(editing))
      },
    }

    if (mode.kind === 'edit') {
      updateTransfer.mutate({ amount: total, occurredOn: draft.occurredOn, description }, handlers)
      return
    }
    createTransfer.mutate(
      {
        payerId: draft.payer === 'me' ? me.id : person.id,
        payeeId: draft.payer === 'me' ? person.id : me.id,
        amount: total,
        occurredOn: draft.occurredOn,
        description,
      },
      handlers,
    )
  }

  const youSide = (
    <span className="flex h-11 min-w-0 items-center gap-2 rounded-[10px] border border-border bg-subtle px-2.5">
      <PersonAvatar id={me.id} name={me.name ?? me.email} size="sm" />
      You
    </span>
  )
  const personSide = editing ? (
    <span className="flex h-11 min-w-0 items-center gap-2 rounded-[10px] border border-border bg-subtle px-2.5">
      {person && <PersonAvatar id={person.id} name={person.displayName} size="sm" />}
      <span className="truncate">{name}</span>
    </span>
  ) : (
    <button
      ref={personRef}
      type="button"
      onClick={() => setOpenSheet('person')}
      aria-invalid={!!errors.person}
      aria-label={person ? `${person.displayName}. Change person` : 'Choose a person'}
      className={cn(
        'flex h-11 min-w-0 items-center gap-2 rounded-[10px] border border-border-strong bg-background px-2.5 text-left focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 focus-visible:outline-none',
        errors.person && 'border-destructive ring-[3px] ring-destructive/15',
      )}
    >
      {person ? (
        <>
          <PersonAvatar id={person.id} name={person.displayName} size="sm" />
          <span className="flex-1 truncate">{name}</span>
        </>
      ) : (
        <span className="flex-1 truncate text-muted-foreground">Choose</span>
      )}
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset disabled={pending} className="flex flex-col gap-5 px-4 pt-4 pb-8">
          {top}

          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">Paid by</span>
                {draft.payer === 'me' ? youSide : personSide}
              </div>
              <button
                type="button"
                aria-label="Swap who paid"
                disabled={editing}
                onClick={() =>
                  update(null, (current) => ({
                    ...current,
                    payer: current.payer === 'me' ? 'them' : 'me',
                  }))
                }
                className="flex size-11 items-center justify-center rounded-full border border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
              >
                <ArrowLeftRight className="size-4.5" aria-hidden="true" />
              </button>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">Paid to</span>
                {draft.payer === 'me' ? personSide : youSide}
              </div>
            </div>
            {errors.person && <FieldError message={errors.person} />}
            {person && (
              <p className="text-[13px] text-muted-foreground">
                {draft.payer === 'me' ? `You paid ${name}` : `${name} paid you`}
              </p>
            )}
          </div>

          <AmountField
            value={draft.amount}
            onChange={(amount) => update('amount', (current) => ({ ...current, amount }))}
            error={errors.amount}
            inputRef={amountRef}
            outcome={
              offerFullBalance && fullBalance !== null ? (
                <button
                  type="button"
                  onClick={() =>
                    update('amount', (current) => ({ ...current, amount: fromGrosze(fullBalance) }))
                  }
                  className="h-11 px-3 text-[13px] font-semibold underline underline-offset-2"
                >
                  Use full balance ({formatGrosze(fullBalance)})
                </button>
              ) : null
            }
          />

          {person && balance !== null && (
            <div
              role="status"
              className={cn(
                'flex items-start gap-2.5 rounded-xl border bg-subtle px-3.5 py-3',
                outcome?.tone === 'warns' && 'border-negative bg-background',
              )}
            >
              {outcome?.tone === 'settles' && (
                <CircleCheck className="size-5 shrink-0 text-positive" aria-hidden="true" />
              )}
              {outcome?.tone === 'reduces' && (
                <Info className="size-5 shrink-0 text-foreground/70" aria-hidden="true" />
              )}
              {outcome?.tone === 'warns' && (
                <TriangleAlert className="size-5 shrink-0 text-negative" aria-hidden="true" />
              )}
              {outcome ? (
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{outcome.title}</span>
                  <span className="text-[13px] text-muted-foreground">{outcome.detail}</span>
                </span>
              ) : (
                <span className="text-[15px] text-muted-foreground">
                  {describePayment(balance, balance, name).detail}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <PillButton onClick={() => setOpenSheet('date')}>
              <Calendar aria-hidden="true" />
              {formatDateLabel(draft.occurredOn)}
            </PillButton>
            {!noteOpen && (
              <PillButton
                onClick={() => {
                  flushSync(() => setNoteOpen(true))
                  noteRef.current?.focus()
                }}
              >
                <FileText aria-hidden="true" />
                Add note
              </PillButton>
            )}
          </div>
          {errors.date && <FieldError message={errors.date} />}

          {noteOpen && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="payment-note" className="text-sm font-medium">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                ref={noteRef}
                id="payment-note"
                rows={2}
                placeholder="e.g. BLIK"
                value={draft.note}
                aria-invalid={!!errors.note}
                onChange={(event) => {
                  const note = event.target.value
                  update('note', (current) => ({ ...current, note }))
                }}
                className="rounded-[10px] border border-border-strong bg-background px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-[3px] focus:ring-foreground/10"
              />
              {errors.note && <FieldError message={errors.note} />}
            </div>
          )}
        </fieldset>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {serverError && (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-destructive/8 px-3.5 py-3 text-[15px] text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </p>
        )}
        <PrimaryButton
          type="submit"
          pending={pending}
          pendingLabel={editing ? 'Saving…' : 'Recording…'}
        >
          {editing
            ? 'Save changes'
            : total
              ? `Record ${formatPln(total)} payment`
              : 'Record payment'}
        </PrimaryButton>
      </div>

      {!editing && (
        <ContactPickerSheet
          open={openSheet === 'person'}
          onOpenChange={(open) => setOpenSheet(open ? 'person' : null)}
          title={draft.payer === 'me' ? 'Who did you pay?' : 'Who paid you?'}
          contacts={contacts?.items.filter((item) => item.person.id !== me.id)}
          selectedId={person?.id ?? null}
          onPick={(picked) => {
            update('person', (current) => ({ ...current, person: picked }))
            setOpenSheet(null)
          }}
        />
      )}
      <DateSheet
        open={openSheet === 'date'}
        onOpenChange={(open) => setOpenSheet(open ? 'date' : null)}
        value={draft.occurredOn}
        onChange={(occurredOn) => update('date', (current) => ({ ...current, occurredOn }))}
      />
    </form>
  )
}

function paymentFieldForPath(propertyPath: string): PaymentField | null {
  const root = propertyPath.split(/[.[]/)[0]
  switch (root) {
    case 'amount':
      return 'amount'
    case 'occurredOn':
      return 'date'
    case 'description':
      return 'note'
    case 'payerId':
    case 'payeeId':
      return 'person'
    default:
      return null
  }
}

function genericError(editing: boolean): string {
  return editing
    ? 'Couldn’t save your changes. Nothing was changed and your entries are still here. Try again.'
    : 'Couldn’t record the payment. Nothing was saved and your entries are still here. Try again.'
}
