import { useRef } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronRight, Repeat } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseIdParam } from '@/lib/parseIdParam'
import { useMe } from '@/api/auth'
import { useComments } from '@/api/comments'
import { useDeleteExpense, useExpense } from '@/api/expenses'
import type { ExpenseResponse } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import { PersonAvatar } from '@/components/PersonAvatar'
import { categoryLabel } from '@/lib/categories'
import { calendarDayKey, formatShortDate } from '@/lib/dates'
import { partOfRepeatLabel, repeatsLabel, repeatStopsLabel } from '@/lib/repeat'
import { balanceTextClassName, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ItemError, ItemLoading, ItemNotFound } from '@/components/ItemStates'
import { DetailActions, DetailScreen, NoteBlock } from './DetailParts'
import { CommentComposer, CommentList } from './ExpenseComments'
import {
  deleteWarning,
  expensePosition,
  otherParticipantNames,
  splitHeading,
  splitPeople,
} from './expenseSummary'
import { useDeleteAndGoBack } from './useDeleteAndGoBack'

export function ExpenseDetailPage() {
  const { t } = useLingui()
  const id = parseIdParam(useParams().id)

  return id === null ? (
    <DetailScreen title={t`Expense`}>
      <ItemNotFound kind="expense" />
    </DetailScreen>
  ) : (
    <ExpenseDetailScreen id={id} />
  )
}

function ExpenseDetailScreen({ id }: { id: number }) {
  const { t } = useLingui()
  const expenseQuery = useExpense(id)
  const { data: me } = useMe()
  const expense = expenseQuery.data
  const expenseTitle = expense?.title ?? ''
  const commentsQuery = useComments(id)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const deletion = useDeleteAndGoBack({
    mutation: useDeleteExpense(id),
    successMessage: t`Expense deleted`,
    errorMessage: t`Couldn’t delete the expense. Try again.`,
  })

  return (
    <DetailScreen
      title={t`Expense`}
      trailing={
        expense &&
        me && (
          <DetailActions
            editTo={`/expenses/${id}/edit`}
            editLabel={t`Edit expense`}
            deleteLabel={t`Delete expense`}
            confirmTitle={t`Delete “${expenseTitle}”?`}
            confirmDescription={deleteWarning(otherParticipantNames(expense, me.id))}
            confirmNote={
              expense.series?.isLatest && expense.repeat?.active ? (
                <p className="flex items-center gap-2 text-[15px] text-foreground/75">
                  <Repeat className="size-4 shrink-0" aria-hidden="true" />
                  {repeatStopsLabel(expense.repeat)}
                </p>
              ) : undefined
            }
            deletion={deletion}
          />
        )
      }
      footer={
        expense &&
        me && (
          <CommentComposer
            expenseId={id}
            onSent={() =>
              requestAnimationFrame(() =>
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
              )
            }
          />
        )
      }
    >
      {expense && me ? (
        <>
          <ExpenseDetail expense={expense} viewerId={me.id} />
          <CommentList commentsQuery={commentsQuery} viewerId={me.id} endRef={commentsEndRef} />
        </>
      ) : expenseQuery.isError ? (
        <ItemError
          error={expenseQuery.error}
          kind="expense"
          onRetry={() => expenseQuery.refetch()}
          isRetrying={expenseQuery.isFetching}
        />
      ) : (
        <ItemLoading label={t`Loading expense`} />
      )}
    </DetailScreen>
  )
}

function ExpenseDetail({ expense, viewerId }: { expense: ExpenseResponse; viewerId: number }) {
  const { t } = useLingui()
  const position = expensePosition(expense, viewerId)
  const positionAmount = formatMoney(position.amount, expense.currency)
  const positionAmountClassName = cn(
    'font-semibold tabular-nums',
    balanceTextClassName[position.direction],
  )
  const paidAmount = formatMoney(expense.amount, expense.currency)

  return (
    <>
      <section className="flex flex-col items-center gap-2.5 px-4 pt-6 pb-5 text-center">
        <CategoryTile category={expense.category} />
        <h2 className="text-xl font-semibold break-words">{expense.title}</h2>
        <p className="text-[28px] font-semibold tabular-nums">
          {formatMoney(expense.amount, expense.currency)}
        </p>
        <p className="-mt-0.5 text-[15px] text-foreground/75">
          {position.direction === 'owed' && (
            <Trans>
              You lent <span className={positionAmountClassName}>{positionAmount}</span>
            </Trans>
          )}
          {position.direction === 'owe' && (
            <Trans>
              You borrowed <span className={positionAmountClassName}>{positionAmount}</span>
            </Trans>
          )}
          {position.direction === 'none' && <Trans>No balance</Trans>}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {formatShortDate(expense.occurredOn)} · {categoryLabel(expense.category)}
        </p>
        <RepeatLine expense={expense} />
      </section>

      <h3 className="mx-4 mt-1 mb-1 text-sm font-medium text-muted-foreground">
        {splitHeading(expense)}
      </h3>
      <ul>
        {splitPeople(expense, viewerId).map((row) => {
          const caption = [row.isPayee ? t`Paid ${paidAmount}` : null, row.splitLabel]
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
                {row.share === null ? t`No share` : formatMoney(row.share, expense.currency)}
              </span>
            </li>
          )
        })}
      </ul>

      <NoteBlock note={expense.description} />
    </>
  )
}

function RepeatLine({ expense }: { expense: ExpenseResponse }) {
  const { t } = useLingui()
  const { repeat, series } = expense
  if (repeat === null || series === null) {
    return null
  }
  if (!series.isLatest) {
    return <OlderRepeatLink label={partOfRepeatLabel(repeat)} latestId={series.latestId} />
  }
  if (!repeat.active || repeat.nextOn === null) {
    return null
  }

  const nextOn = formatShortDate(calendarDayKey(repeat.nextOn))
  return (
    <p className="-mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Repeat className="size-3.5 shrink-0" aria-hidden="true" />
      {repeatsLabel(repeat)} · {t`next on ${nextOn}`}
    </p>
  )
}

function OlderRepeatLink({ label, latestId }: { label: string; latestId: number }) {
  const { t } = useLingui()
  const latest = useExpense(latestId).data
  const latestOn = latest ? formatShortDate(calendarDayKey(latest.occurredOn)) : null

  return (
    <Link
      to={`/expenses/${latestId}`}
      className="-mt-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[13px] font-medium text-foreground/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Repeat className="size-3.5 shrink-0" aria-hidden="true" />
      {latestOn === null ? label : `${label} · ${t`latest ${latestOn}`}`}
      <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
    </Link>
  )
}
