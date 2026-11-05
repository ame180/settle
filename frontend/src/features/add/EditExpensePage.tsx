import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/api/auth'
import { useExpense } from '@/api/expenses'
import type { ExpenseResponse, MeResponse } from '@/api/types'
import { DiscardSheet } from './DiscardSheet'
import { draftChanged, draftFromExpense } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { LoadFailed } from './LoadFailed'
import { useGoBack, useLeaveGuard } from './navigation'
import { Frame, Header, Loading } from './ScreenFrame'

/** /expenses/:id/edit: the Add expense form, loaded with the expense and saved with PUT. */
export function EditExpensePage() {
  const { id } = useParams()
  const expenseId = Number(id)
  const { data: me } = useMe()
  const expense = useExpense(expenseId)
  const goBack = useGoBack(`/expenses/${expenseId}`)

  if (!me || expense.isPending) {
    return <Frame title="Edit expense" onClose={goBack} body={<Loading />} />
  }
  if (expense.isError) {
    return (
      <Frame
        title="Edit expense"
        onClose={goBack}
        body={<LoadFailed what="expense" error={expense.error} onRetry={() => expense.refetch()} />}
      />
    )
  }

  return <EditExpenseForm me={me} expense={expense.data} goBack={goBack} />
}

function EditExpenseForm({
  me,
  expense,
  goBack,
}: {
  me: MeResponse
  expense: ExpenseResponse
  goBack: () => void
}) {
  const [initialDraft] = useState(() => draftFromExpense(expense, me.id))
  const [draft, setDraft] = useState(initialDraft)
  const guard = useLeaveGuard(draftChanged(draft, initialDraft))

  return (
    <div className="flex h-full flex-col">
      <Header title="Edit expense" onClose={goBack} />
      <ExpenseForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{ kind: 'edit', expenseId: expense.id }}
        onSaved={(message) => {
          toast.success(message)
          guard.allowLeave()
          goBack()
        }}
      />
      <DiscardSheet
        open={guard.blocked}
        title="Discard your changes?"
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </div>
  )
}
