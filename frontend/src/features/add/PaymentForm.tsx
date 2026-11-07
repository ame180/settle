import { useRef, useState, type ReactNode } from 'react'
import { ArrowLeftRight, ChevronDown, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useContacts } from '@/api/contacts'
import { useCreateTransfer, useUpdateTransfer } from '@/api/transfers'
import type { MeResponse, PersonRef } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { findPlnAmount, formatGrosze, formatPln, fromGrosze, toGrosze } from '@/lib/money'
import { getShortName, ownDisplayName } from '@/lib/person'
import { cn } from '@/lib/utils'
import { AmountField } from './AmountField'
import { ContactPickerSheet } from './ContactPickerSheet'
import { DateNoteFields } from './DateNoteFields'
import { amountError, amountTotal } from './expenseDraft'
import { FieldError } from '@/components/FieldError'
import { FormFooter, PrimaryButton } from './formParts'
import {
  clearingPayer,
  describeBalance,
  describePayment,
  paymentEffect,
  type PaymentOutcome,
  type PaymentPayer,
} from './paymentModel'
import { describeSaveError } from './saveErrors'

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
  const [pickerOpen, setPickerOpen] = useState(false)
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
  // Offered while the payment goes the way that clears the balance but isn't all of it.
  const fullBalance =
    balance !== null && balance !== 0n && draft.payer === clearingPayer(balance)
      ? balance < 0n
        ? -balance
        : balance
      : null
  const offerFullBalance =
    fullBalance !== null && (total === null || toGrosze(total) !== fullBalance)

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
        const { errors: fieldErrors, banner } = describeSaveError(
          error,
          paymentFieldForPath,
          genericError(editing),
        )
        if (Object.keys(fieldErrors).length > 0) {
          showErrors(fieldErrors)
        }
        setServerError(banner)
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
      <PersonAvatar id={me.id} name={ownDisplayName(me)} size="sm" />
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
      onClick={() => setPickerOpen(true)}
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
                // Fixed in edit mode (the API can't change it); kept in place for the layout.
                disabled={editing}
                aria-hidden={editing || undefined}
                onClick={() =>
                  update(null, (current) => ({
                    ...current,
                    payer: current.payer === 'me' ? 'them' : 'me',
                  }))
                }
                className={cn(
                  'flex size-11 items-center justify-center rounded-full border border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  editing && 'invisible',
                )}
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
              <div className="flex w-full flex-col items-center">
                {offerFullBalance && (
                  <button
                    type="button"
                    onClick={() =>
                      update('amount', (current) => ({
                        ...current,
                        amount: fromGrosze(fullBalance),
                      }))
                    }
                    className="h-11 px-3 text-[13px] font-semibold underline underline-offset-2"
                  >
                    Use full balance ({formatGrosze(fullBalance)})
                  </button>
                )}
                {person && balance !== null && (
                  <BalanceLine
                    outcome={outcome}
                    fallback={describeBalance(balance, name)}
                    className={offerFullBalance ? undefined : 'mt-2'}
                  />
                )}
              </div>
            }
          />

          <DateNoteFields
            idPrefix="payment"
            occurredOn={draft.occurredOn}
            onDateChange={(occurredOn) => update('date', (current) => ({ ...current, occurredOn }))}
            dateError={errors.date}
            note={draft.note}
            onNoteChange={(note) => update('note', (current) => ({ ...current, note }))}
            noteError={errors.note}
            noteRef={noteRef}
            notePlaceholder="e.g. BLIK"
          />
        </fieldset>
      </div>

      <FormFooter serverError={serverError}>
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
      </FormFooter>

      {!editing && (
        <ContactPickerSheet
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          title={draft.payer === 'me' ? 'Who did you pay?' : 'Who paid you?'}
          contacts={contacts?.items.filter((item) => item.person.id !== me.id)}
          selectedId={person?.id ?? null}
          onPick={(picked) => {
            update('person', (current) => ({ ...current, person: picked }))
            setPickerOpen(false)
          }}
        />
      )}
    </form>
  )
}

/** What the balance with that person becomes; the warning style when it grows the debt. */
function BalanceLine({
  outcome,
  fallback,
  className,
}: {
  outcome: PaymentOutcome | null
  fallback: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-2.5 rounded-xl border bg-subtle px-3.5 py-3 text-left',
        outcome?.tone === 'warns' && 'border-negative bg-background',
        className,
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
          <span aria-live="polite" className="text-[15px] font-semibold">
            {outcome.title}
          </span>
          <span className="text-[13px] text-muted-foreground">{outcome.detail}</span>
        </span>
      ) : (
        <span className="text-[15px] text-muted-foreground">{fallback}</span>
      )}
    </div>
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
