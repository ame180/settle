import { Activity } from 'lucide-react'
import { useActivity } from '@/api/activity'
import { useMe } from '@/api/auth'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'
import { LoadError } from '@/components/LoadError'
import { StateMessage } from '@/components/StateMessage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDayLabel } from '@/lib/dates'
import { ActivityListFooter } from './ActivityListFooter'
import { ActivityRow, ActivityRowSkeleton, DayHeader } from './ActivityRows'
import { activityItemKey, flattenActivityPages, groupActivityByDay } from './activityItems'

export function ActivityPage() {
  const activityQuery = useActivity()
  const { data: me } = useMe()

  return (
    <>
      <PageHeader title="Activity" />

      <div className="pb-32">
        {activityQuery.isPending ? (
          <ActivitySkeleton />
        ) : activityQuery.data === undefined ? (
          <LoadError
            title="Couldn't load activity"
            onRetry={() => activityQuery.refetch()}
            isRetrying={activityQuery.isFetching}
          />
        ) : (
          <ActivityFeed
            items={flattenActivityPages(activityQuery.data.pages)}
            viewerId={me?.id ?? 0}
            // Today/Yesterday follow the last fetch, so a feed left open overnight relabels on refetch.
            now={new Date(activityQuery.dataUpdatedAt)}
            query={activityQuery}
          />
        )}
      </div>

      <AddExpenseButton />
    </>
  )
}

type ActivityFeedProps = {
  items: ReturnType<typeof flattenActivityPages>
  viewerId: number
  now: Date
  query: ReturnType<typeof useActivity>
}

function ActivityFeed({ items, viewerId, now, query }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <StateMessage
        icon={<Activity className="size-7.5" aria-hidden="true" />}
        title="No activity yet"
        description="Expenses and payments you take part in show up here, newest first."
      />
    )
  }

  return (
    <>
      {groupActivityByDay(items).map(({ day, items: dayItems }) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <DayHeader id={`day-${day}`} label={formatDayLabel(day, now)} />
          <ul>
            {dayItems.map((item) => (
              <li key={activityItemKey(item)}>
                <ActivityRow item={item} viewerId={viewerId} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ActivityListFooter query={query} />
    </>
  )
}

const skeletonRows = [
  ['48%', '70%'],
  ['62%', '54%'],
  ['40%', '76%'],
  ['56%', '60%'],
  ['44%', '66%'],
  ['66%', '50%'],
  ['38%', '72%'],
]

function ActivitySkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading activity</span>
      {skeletonRows.map(([titleWidth, sublineWidth], index) => (
        <div key={titleWidth}>
          {index % 3 === 0 && (
            <div className="flex h-10 items-end px-4 pb-2">
              <Skeleton className="h-3 w-20" />
            </div>
          )}
          <ActivityRowSkeleton titleWidth={titleWidth} sublineWidth={sublineWidth} />
        </div>
      ))}
    </div>
  )
}
