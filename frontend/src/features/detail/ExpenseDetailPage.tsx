import { useParams } from 'react-router'
import { parseIdParam } from '@/lib/parseIdParam'
import { useMe } from '@/api/auth'
import { useDeleteExpense, useExpense } from '@/api/expenses'
import type { ExpenseResponse } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import { PersonAvatar } from '@/components/PersonAvatar'
import { categoryInfo } from '@/lib/categories'
import { formatShortDate } from '@/lib/dates'
import { balanceTextClassName, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ItemError, ItemLoading, ItemNotFound } from '@/components/ItemStates'
import { DetailActions, DetailScreen, NoteBlock } from './DetailParts'
import {
  deleteWarning,
  expensePosition,
  otherParticipantNames,
  splitHeading,
  splitPeople,
} from './expenseSummary'
import { useDeleteAndGoBack } from './useDeleteAndGoBack'

export function ExpenseDetailPage() {
  const id = parseIdParam(useParams().id)

  return id === null ? (
    <DetailScreen title="Expense">
      <ItemNotFound noun="expense" />
    </DetailScreen>
  ) : (
    <ExpenseDetailScreen id={id} />
  )
}

function ExpenseDetailScreen({ id }: { id: number }) {
  const expenseQuery = useExpense(id)
  const { data: me } = useMe()
  const expense = expenseQuery.data
  const deletion = useDeleteAndGoBack({
    mutation: useDeleteExpense(id),
    successMessage: 'Expense deleted',
    errorMessage: 'Couldn’t delete the expense. Try again.',
  })

  return (
    <DetailScreen
      title="Expense"
      trailing={
        expense &&
        me && (
          <DetailActions
            editTo={`/expenses/${id}/edit`}
            editLabel="Edit expense"
            deleteLabel="Delete expense"
            confirmTitle={`Delete “${expense.title}”?`}
            confirmDescription={deleteWarning(otherParticipantNames(expense, me.id))}
            deletion={deletion}
          />
        )
      }
    >
      {expense && me ? (
        <ExpenseDetail expense={expense} viewerId={me.id} />
      ) : expenseQuery.isError ? (
        <ItemError
          error={expenseQuery.error}
          noun="expense"
          onRetry={() => expenseQuery.refetch()}
          isRetrying={expenseQuery.isFetching}
        />
      ) : (
        <ItemLoading label="Loading expense" />
      )}
    </DetailScreen>
  )
}

function ExpenseDetail({ expense, viewerId }: { expense: ExpenseResponse; viewerId: number }) {
  const position = expensePosition(expense, viewerId)

  return (
    <>
      <section className="flex flex-col items-center gap-2.5 px-4 pt-6 pb-5 text-center">
        <CategoryTile category={expense.category} />
        <h2 className="text-xl font-semibold break-words">{expense.title}</h2>
        <p className="text-[28px] font-semibold tabular-nums">
          {formatMoney(expense.amount, expense.currency)}
        </p>
        <p className="-mt-0.5 text-[15px] text-foreground/75">
          {position.label}
          {position.direction !== 'none' && (
            <>
              {' '}
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  balanceTextClassName[position.direction],
                )}
              >
                {formatMoney(position.amount, expense.currency)}
              </span>
            </>
          )}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {formatShortDate(expense.occurredOn)} · {categoryInfo[expense.category].label}
        </p>
      </section>

      <h3 className="mx-4 mt-1 mb-1 text-sm font-medium text-muted-foreground">
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
    </>
  )
}
