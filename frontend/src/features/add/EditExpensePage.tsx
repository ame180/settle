import { useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useParams } from 'react-router'
import { parseIdParam } from '@/lib/parseIdParam'
import { calendarDayKey } from '@/lib/dates'
import { useMe } from '@/api/auth'
import { useExpense } from '@/api/expenses'
import type { ExpenseResponse, MeResponse } from '@/api/types'
import { DiscardSheet } from './DiscardSheet'
import { draftChanged, draftFromExpense } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { useGoBack } from '@/lib/useGoBack'
import { useLeaveGuard } from './navigation'
import { ItemError, ItemLoading } from '@/components/ItemStates'
import { Frame, Header, NotFoundFrame } from './ScreenFrame'

/** /expenses/:id/edit: the Add expense form, loaded with the expense and saved with PUT. */
export function EditExpensePage() {
  const { t } = useLingui()
  const expenseId = parseIdParam(useParams().id)

  return expenseId === null ? (
    <NotFoundFrame title={t`Edit expense`} kind="expense" />
  ) : (
    <EditExpenseLoader expenseId={expenseId} />
  )
}

function EditExpenseLoader({ expenseId }: { expenseId: number }) {
  const { t } = useLingui()
  const { data: me } = useMe()
  const expense = useExpense(expenseId)
  const fallback = `/expenses/${expenseId}`
  const { goBack } = useGoBack(fallback)

  if (!me || expense.isPending) {
    return (
      <Frame
        title={t`Edit expense`}
        onClose={goBack}
        body={<ItemLoading label={t`Loading expense`} />}
      />
    )
  }
  if (expense.isError) {
    return (
      <Frame
        title={t`Edit expense`}
        onClose={goBack}
        body={
          <ItemError
            error={expense.error}
            kind="expense"
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
  const { t } = useLingui()
  const [initialDraft] = useState(() => draftFromExpense(expense, me.id))
  const [draft, setDraft] = useState(initialDraft)
  const guard = useLeaveGuard(draftChanged(draft, initialDraft), fallback)
  const series = expense.series
  const continuesRepeat = series?.isLatest === true && expense.repeat?.active === true
  // The server's next date only holds while the date and the repeat stay as loaded.
  const scheduleKept =
    draft.occurredOn === initialDraft.occurredOn && draft.repeat === initialDraft.repeat
  const nextOn = expense.repeat?.nextOn

  return (
    <div className="flex h-full flex-col">
      <Header title={t`Edit expense`} onClose={guard.goBack} />
      <ExpenseForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{
          kind: 'edit',
          expenseId: expense.id,
          canRepeat: series === null || series.isLatest,
          nextCopy:
            continuesRepeat && draft.repeat !== 'off'
              ? { on: scheduleKept && nextOn ? calendarDayKey(nextOn) : null }
              : null,
        }}
        onSaved={guard.leaveAfterSave}
      />
      <DiscardSheet guard={guard} title={t`Discard your changes?`} />
    </div>
  )
}
