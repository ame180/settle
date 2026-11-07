import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/api/auth'
import { useContacts } from '@/api/contacts'
import type { ContactListItem, MeResponse, PersonRef } from '@/api/types'
import { todayIso } from '@/lib/dates'
import { findPlnAmount, toGrosze } from '@/lib/money'
import { parseUserId } from '@/lib/parseUserId'
import { cn } from '@/lib/utils'
import { DiscardSheet } from './DiscardSheet'
import { amountTotal, draftChanged, emptyDraft, type ExpenseDraft } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { useGoBack } from '@/lib/useGoBack'
import { useLeaveGuard } from './navigation'
import { PaymentForm, type PaymentDraft } from './PaymentForm'
import { clearingPayer, type PaymentPayer } from './paymentModel'
import { Header, Loading } from './ScreenFrame'
import { prunePeople } from './splitModel'

/**
 * /add, full screen, with Expense | Payment tabs. Links other screens use:
 * - `?contact=<userId>` prefills that person and starts on the title;
 * - `?tab=payment&contact=<userId>&amount=<decimal>&payer=me|them` opens the Payment tab
 *   prefilled (`payer` is who paid), as Settle up does.
 * Switching tabs keeps the person, amount, date and note.
 */
export function AddPage() {
  const { data: me } = useMe()
  // RequireAuth only renders this with a signed-in user.
  return me ? <AddScreen me={me} /> : null
}

type Tab = 'expense' | 'payment'

type Prefill = {
  tab: Tab
  person: PersonRef | null
  amount: string
  payer: PaymentPayer
}

function AddScreen({ me }: { me: MeResponse }) {
  const [searchParams] = useSearchParams()
  const contactId = parseUserId(searchParams.get('contact') ?? undefined)
  const { data: contacts, isError } = useContacts()

  // Wait for contacts before prefilling, so the form mounts with its starting state.
  if (contactId !== null && !contacts && !isError) {
    return <Loading />
  }

  const contact = contacts?.items.find((item) => item.person.id === contactId)
  const prefill: Prefill = {
    tab: searchParams.get('tab') === 'payment' ? 'payment' : 'expense',
    person: contact?.person ?? null,
    amount: amountTotal(searchParams.get('amount') ?? '') ?? '',
    payer: parsePayer(searchParams.get('payer')) ?? defaultPayer(contact),
  }

  // Opened from a contact's page without history (reload, shared link): close lands back there.
  const backFallback = contact ? `/contacts/${contact.person.id}` : '/'

  return <AddTabs me={me} prefill={prefill} backFallback={backFallback} />
}

function parsePayer(value: string | null): PaymentPayer | null {
  return value === 'me' || value === 'them' ? value : null
}

/** Without `payer`, start with the direction that clears what's owed. */
function defaultPayer(contact: ContactListItem | undefined): PaymentPayer {
  const balance = contact ? findPlnAmount(contact.balances) : null
  return balance === null ? 'me' : clearingPayer(toGrosze(balance))
}

function AddTabs({
  me,
  prefill,
  backFallback,
}: {
  me: MeResponse
  prefill: Prefill
  backFallback: string
}) {
  // Frozen on mount: later contact refetches or a new day mustn't count as the user's input.
  const [initial] = useState(() => {
    const occurredOn = todayIso()
    const expense: ExpenseDraft = {
      ...emptyDraft(me.id, occurredOn),
      others: prefill.person ? [prefill.person] : [],
      amount: prefill.amount,
    }
    const payment: PaymentDraft = {
      person: prefill.person,
      payer: prefill.payer,
      amount: prefill.amount,
      occurredOn,
      note: '',
    }
    return { expense, payment }
  })
  // Where the expense form starts; picking people later mustn't move focus to the title.
  const [startFocus] = useState<'title' | 'people'>(
    initial.expense.others.length > 0 ? 'title' : 'people',
  )
  const [tab, setTab] = useState<Tab>(prefill.tab)
  const [switched, setSwitched] = useState(false)
  const [expense, setExpense] = useState(initial.expense)
  const [payment, setPayment] = useState(initial.payment)

  // Prefilled values aren't the user's input, so they don't make the form dirty.
  const expenseDirty = draftChanged(expense, initial.expense)
  const dirty = expenseDirty || JSON.stringify(payment) !== JSON.stringify(initial.payment)
  const guard = useLeaveGuard(dirty)
  const { goBack } = useGoBack(backFallback)

  function switchTo(next: Tab) {
    if (next === tab) {
      return
    }
    setSwitched(true)
    setTab(next)
    if (next === 'payment') {
      setPayment((current) => ({
        ...current,
        person: expense.others[0] ?? null,
        amount: expense.amount,
        occurredOn: expense.occurredOn,
        note: expense.note,
      }))
      return
    }
    // A 1:1 expense follows the person picked on Payment; a group keeps its people.
    const person = payment.person
    const others =
      person === null
        ? expense.others
        : expense.others.length <= 1
          ? [person]
          : [person, ...expense.others.filter((other) => other.id !== person.id)]
    setExpense((current) => ({
      ...current,
      others,
      split: prunePeople(current.split, [me.id, ...others.map((other) => other.id)], me.id),
      amount: payment.amount,
      occurredOn: payment.occurredOn,
      note: payment.note,
    }))
  }

  function onSaved(message: string) {
    toast.success(message)
    guard.allowLeave()
    goBack()
  }

  const tabs = <AddTabList tab={tab} onChange={switchTo} />

  return (
    <div className="flex h-full flex-col">
      <Header title={tab === 'expense' ? 'Add expense' : 'Record payment'} onClose={goBack} />
      {tab === 'expense' ? (
        <ExpenseForm
          key="expense"
          me={me}
          draft={expense}
          onDraftChange={setExpense}
          mode={{ kind: 'create' }}
          initialFocus={switched ? undefined : startFocus}
          top={tabs}
          onSaved={onSaved}
        />
      ) : (
        <PaymentForm
          key="payment"
          me={me}
          draft={payment}
          onDraftChange={setPayment}
          mode={{ kind: 'create' }}
          top={tabs}
          onSaved={onSaved}
        />
      )}
      <DiscardSheet
        open={guard.blocked}
        title={
          expenseDirty && tab === 'expense'
            ? 'Discard this expense?'
            : expenseDirty
              ? 'Discard what you’ve entered?'
              : 'Discard this payment?'
        }
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </div>
  )
}

function AddTabList({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="What are you adding"
      className="grid grid-cols-2 rounded-full bg-secondary p-1"
    >
      {(['expense', 'payment'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={tab === value}
          onClick={() => onChange(value)}
          className={cn(
            'h-10 rounded-full text-[15px] font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            tab === value &&
              'bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
          )}
        >
          {value === 'expense' ? 'Expense' : 'Payment'}
        </button>
      ))}
    </div>
  )
}
