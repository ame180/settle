import { useParams } from 'react-router'
import { useMe } from '@/api/auth'
import { expenseQueryKey, useDeleteExpense, useExpense } from '@/api/detail'
import type { ExpenseResponse } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import { PersonAvatar } from '@/components/PersonAvatar'
import { categoryInfo } from '@/lib/categories'
import { formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  DeleteSection,
  DetailError,
  DetailLoading,
  DetailScreen,
  EditLink,
  NoteBlock,
} from './DetailParts'
import {
  deleteWarning,
  expensePosition,
  otherParticipantNames,
  splitHeading,
  splitPeople,
} from './expenseSummary'
import { useDeleteAndGoBack } from './useDeleteAndGoBack'

export function ExpenseDetailPage() {
  const id = Number(useParams().id)
  const expenseQuery = useExpense(id)
  const { data: me } = useMe()
  const expense = expenseQuery.data

  return (
    <DetailScreen
      title="Expense"
      trailing={expense && <EditLink to={`/expenses/${id}/edit`} label="Edit expense" />}
    >
      {expense && me ? (
        <ExpenseDetail expense={expense} viewerId={me.id} />
      ) : expenseQuery.isError ? (
        <DetailError
          error={expenseQuery.error}
          noun="expense"
          onRetry={() => expenseQuery.refetch()}
          isRetrying={expenseQuery.isFetching}
        />
      ) : (
        <DetailLoading label="Loading expense" />
      )}
    </DetailScreen>
  )
}

function ExpenseDetail({ expense, viewerId }: { expense: ExpenseResponse; viewerId: number }) {
  const position = expensePosition(expense, viewerId)
  const deletion = useDeleteAndGoBack({
    mutation: useDeleteExpense(expense.id),
    detailQueryKey: expenseQueryKey(expense.id),
    successMessage: 'Expense deleted',
    errorMessage: 'Couldn’t delete the expense. Try again.',
  })

  return (
    <>
      <section className="flex flex-col items-center gap-2.5 px-4 pt-6 pb-5 text-center">
        <CategoryTile category={expense.category} />
        <h2 className="text-xl font-semibold break-words">{expense.title}</h2>
        <p className="text-[28px] font-semibold tabular-nums">
          {formatMoney(expense.amount, expense.currency)}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {formatShortDate(expense.occurredOn)} · {categoryInfo[expense.category].label}
        </p>
      </section>

      <div className="mx-4 flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3.5">
        <span className="text-[15px] text-foreground/75">{position.label}</span>
        <span
          className={cn(
            'text-[17px] font-semibold tabular-nums',
            position.direction === 'owed' && 'text-positive',
            position.direction === 'owe' && 'text-negative',
            position.direction === 'none' && 'text-muted-foreground',
          )}
        >
          {formatMoney(position.amount, expense.currency)}
        </span>
      </div>

      <h3 className="mx-4 mt-6 mb-1 text-sm font-medium text-muted-foreground">
        {splitHeading(expense)}
      </h3>
      <ul>
        {splitPeople(expense, viewerId).map((row) => {
          const caption = [
            row.isPayee ? `Paid ${formatMoney(expense.amount, expense.currency)}` : null,
            row.splitLabel,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={row.person.id} className="flex min-h-14 items-center gap-3 px-4 py-1.5">
              <PersonAvatar id={row.person.id} name={row.person.displayName} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate">{row.name}</span>
                {caption && <span className="text-[13px] text-muted-foreground">{caption}</span>}
              </span>
              <span className="shrink-0 text-[15px] text-foreground/75 tabular-nums">
                {row.share === null ? 'No share' : formatMoney(row.share, expense.currency)}
              </span>
            </li>
          )
        })}
      </ul>

      <NoteBlock note={expense.description} />

      <DeleteSection
        actionLabel="Delete expense"
        title={`Delete “${expense.title}”?`}
        description={deleteWarning(otherParticipantNames(expense, viewerId))}
        open={deletion.isConfirmOpen}
        onOpenChange={deletion.setConfirmOpen}
        onConfirm={deletion.confirm}
        isPending={deletion.isPending}
      />
    </>
  )
}
