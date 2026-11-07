import { Link } from 'react-router'
import { Banknote } from 'lucide-react'
import type { ActivityItem } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import { PersonAvatar } from '@/components/PersonAvatar'
import { formatShortDate } from '@/lib/dates'
import { SignedAmount } from '@/components/SignedAmount'
import { balanceDirection, formatMoney } from '@/lib/money'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { nameForViewer } from '@/lib/person'
import { activityItemPath, balanceDirectionLabel, describeTransfer } from './activityItems'

const rowLinkClassName =
  'flex w-full items-center px-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset active:bg-muted'

type RowProps = {
  item: ActivityItem
  viewerId: number
  /** Adds the date to the row, for lists without day headers. */
  showDate?: boolean
  now?: Date
}

type ExpenseRowProps = RowProps & {
  /** `avatar`: who paid, for feeds that mix people. `category`: solid category tile. */
  lead?: 'avatar' | 'category'
}

export function ExpenseRow({
  item,
  viewerId,
  lead = 'avatar',
  showDate = false,
  now,
}: ExpenseRowProps) {
  const { payee } = item
  const payerLabel = nameForViewer(payee, viewerId)
  const subline = `${payerLabel} paid ${formatMoney(item.amount, item.currency)}`

  return (
    <Link to={activityItemPath(item)} className={cn(rowLinkClassName, 'min-h-17 gap-3.5 py-2.5')}>
      {lead === 'category' ? (
        <CategoryTile category={item.category ?? 'general'} />
      ) : (
        <PersonAvatar id={payee.id} name={payee.displayName} />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate">{item.title}</span>{' '}
        <span className="truncate text-[13px] text-muted-foreground">
          {showDate ? `${formatShortDate(item.occurredOn, now)} · ${subline}` : subline}
        </span>
      </span>{' '}
      <SignedAmount
        direction={balanceDirection(item.value)}
        label={balanceDirectionLabel[balanceDirection(item.value)]}
      >
        {formatMoney(item.value, item.currency)}
      </SignedAmount>
    </Link>
  )
}

/** A transfer as a slim one-line note: "Anna paid you 150.00 zł". No tile, no amount column. */
export function SettlementRow({ item, viewerId, showDate = false, now }: RowProps) {
  const { actor, verb } = describeTransfer(item, viewerId)

  return (
    <Link
      to={activityItemPath(item)}
      className={cn(
        rowLinkClassName,
        // -mt-px lets two settlements in a row share one border.
        '-mt-px min-h-13 gap-3 border-y bg-muted/40 py-2 text-[15px] text-foreground/80',
      )}
    >
      <span className="flex w-11 shrink-0 justify-center">
        <span className="flex size-7.5 items-center justify-center rounded-full border border-foreground/15 bg-background">
          <Banknote className="size-4" aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{actor}</span> {verb}{' '}
        <span className="font-semibold whitespace-nowrap tabular-nums">
          {formatMoney(item.amount, item.currency)}
        </span>
      </span>
      {showDate && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatShortDate(item.occurredOn, now)}
        </span>
      )}
    </Link>
  )
}

/** Either row, picked by the item's type. */
export function ActivityRow(props: ExpenseRowProps) {
  return props.item.type === 'expense' ? <ExpenseRow {...props} /> : <SettlementRow {...props} />
}

export function DayHeader({ id, label }: { id?: string; label: string }) {
  return (
    <h2
      id={id}
      className="flex h-10 items-end px-4 pb-1.5 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase"
    >
      {label}
    </h2>
  )
}

/** Placeholder for an activity row while the feed loads. */
export function ActivityRowSkeleton({
  titleWidth,
  sublineWidth,
}: {
  titleWidth: string
  sublineWidth: string
}) {
  return (
    <div className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
      <Skeleton className="size-11 shrink-0 rounded-tile" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5" style={{ width: titleWidth }} />
        <Skeleton className="h-2.5" style={{ width: sublineWidth }} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="h-3.5 w-19" />
      </div>
    </div>
  )
}
