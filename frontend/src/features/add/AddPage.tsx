import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/api/auth'
import { useContacts } from '@/api/contacts'
import type { MeResponse, PersonRef } from '@/api/types'
import { todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { DiscardSheet } from './DiscardSheet'
import { amountTotal, emptyDraft, type ExpenseDraft } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { useGoBack, useLeaveGuard } from './navigation'
import { PaymentForm, type PaymentDraft } from './PaymentForm'
import type { PaymentPayer } from './paymentModel'
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
  const contactId = Number(searchParams.get('contact')) || null
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
    payer: searchParams.get('payer') === 'them' ? 'them' : 'me',
  }

  return <AddTabs me={me} prefill={prefill} />
}

function AddTabs({ me, prefill }: { me: MeResponse; prefill: Prefill }) {
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
  const [tab, setTab] = useState<Tab>(prefill.tab)
  const [switched, setSwitched] = useState(false)
  const [expense, setExpense] = useState(initial.expense)
  const [payment, setPayment] = useState(initial.payment)

  // Prefilled values aren't the user's input, so they don't make the form dirty.
  const dirty =
    JSON.stringify([expense, payment]) !== JSON.stringify([initial.expense, initial.payment])
  const guard = useLeaveGuard(dirty)
  const goBack = useGoBack('/')

  function switchTo(next: Tab) {
    if (next === tab) {
      return
    }
    setSwitched(true)
    setTab(next)
    if (next === 'payment') {
      setPayment((current) => ({
        ...current,
        person: expense.others[0] ?? current.person,
        amount: expense.amount,
        occurredOn: expense.occurredOn,
        note: expense.note,
      }))
      return
    }
    const person = payment.person
    const others =
      person === null
        ? expense.others
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
          initialFocus={switched ? undefined : expense.others.length > 0 ? 'title' : 'people'}
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
        title={tab === 'expense' ? 'Discard this expense?' : 'Discard this payment?'}
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
