import { useState } from 'react'
import { useParams } from 'react-router'
import { useMe } from '@/api/auth'
import { useExpense } from '@/api/expenses'
import type { ExpenseResponse, MeResponse } from '@/api/types'
import { DiscardSheet } from './DiscardSheet'
import { draftChanged, draftFromExpense } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { useGoBack } from '@/lib/useGoBack'
import { useLeaveGuard } from './navigation'
import { DetailError, DetailLoading } from '@/features/detail/DetailParts'
import { Frame, Header } from './ScreenFrame'

/** /expenses/:id/edit: the Add expense form, loaded with the expense and saved with PUT. */
export function EditExpensePage() {
  const { id } = useParams()
  const expenseId = Number(id)
  const { data: me } = useMe()
  const expense = useExpense(expenseId)
  const fallback = `/expenses/${expenseId}`
  const { goBack } = useGoBack(fallback)

  if (!me || expense.isPending) {
    return (
      <Frame
        title="Edit expense"
        onClose={goBack}
        body={<DetailLoading label="Loading expense" />}
      />
    )
  }
  if (expense.isError) {
    return (
      <Frame
        title="Edit expense"
        onClose={goBack}
        body={
          <DetailError
            error={expense.error}
            noun="expense"
            onRetry={() => expense.refetch()}
            isRetrying={expense.isFetching}
          />
        }
      />
    )
  }

  return <EditExpenseForm me={me} expense={expense.data} fallback={fallback} />
}

function EditExpenseForm({
  me,
  expense,
  fallback,
}: {
  me: MeResponse
  expense: ExpenseResponse
  fallback: string
}) {
  const [initialDraft] = useState(() => draftFromExpense(expense, me.id))
  const [draft, setDraft] = useState(initialDraft)
  const guard = useLeaveGuard(draftChanged(draft, initialDraft), fallback)

  return (
    <div className="flex h-full flex-col">
      <Header title="Edit expense" onClose={guard.goBack} />
      <ExpenseForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{ kind: 'edit', expenseId: expense.id }}
        onSaved={guard.leaveAfterSave}
      />
      <DiscardSheet guard={guard} title="Discard your changes?" />
    </div>
  )
}
