import { useEffect, useRef } from 'react'
import { Activity, CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { useActivity } from '@/api/activity'
import { useMe } from '@/api/auth'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { formatDayLabel } from '@/lib/dates'
import { ActivityRow, DayHeader } from './ActivityRows'
import { activityItemKey, flattenActivityPages, groupActivityByDay } from './activityItems'

const pillClassName = 'rounded-full px-5 text-[15px]'

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
          <StateMessage
            role="alert"
            icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
            iconClassName="bg-destructive/10 text-destructive"
            title="Couldn't load activity"
            description="Check your connection and try again."
          >
            <Button
              variant="outline"
              className={pillClassName}
              onClick={() => activityQuery.refetch()}
              disabled={activityQuery.isFetching}
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          </StateMessage>
        ) : (
          <ActivityFeed
            items={flattenActivityPages(activityQuery.data.pages)}
            viewerId={me?.id ?? 0}
            // Today/Yesterday follow the last fetch, so a feed left open overnight relabels on refetch.
            now={new Date(activityQuery.dataUpdatedAt)}
            hasNextPage={activityQuery.hasNextPage}
            isFetchingNextPage={activityQuery.isFetchingNextPage}
            isNextPageError={activityQuery.isFetchNextPageError}
            fetchNextPage={() => activityQuery.fetchNextPage({ cancelRefetch: false })}
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
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isNextPageError: boolean
  fetchNextPage: () => void
}

function ActivityFeed({
  items,
  viewerId,
  now,
  hasNextPage,
  isFetchingNextPage,
  isNextPageError,
  fetchNextPage,
}: ActivityFeedProps) {
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

      {isFetchingNextPage ? (
        <div role="status" className="flex justify-center py-5 text-muted-foreground">
          <LoaderCircle className="size-6 motion-safe:animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading more activity</span>
        </div>
      ) : isNextPageError ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-4 pt-6">
          <p className="text-sm text-muted-foreground">Couldn't load more activity.</p>
          <Button variant="outline" className={pillClassName} onClick={fetchNextPage}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : (
        hasNextPage && <LoadMoreSentinel onVisible={fetchNextPage} />
      )}
    </>
  )
}

/** Fetches the next page once the end of the list scrolls into view. */
function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const onVisibleRef = useRef(onVisible)

  useEffect(() => {
    onVisibleRef.current = onVisible
  })

  useEffect(() => {
    const element = ref.current
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisibleRef.current()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref} aria-hidden="true" className="h-px" />
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
              <div className="h-3 w-20 motion-safe:animate-pulse rounded bg-muted" />
            </div>
          )}
          <div className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
            <div className="size-11 shrink-0 motion-safe:animate-pulse rounded-full bg-muted" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div
                className="h-3.5 motion-safe:animate-pulse rounded bg-muted"
                style={{ width: titleWidth }}
              />
              <div
                className="h-2.5 motion-safe:animate-pulse rounded bg-muted"
                style={{ width: sublineWidth }}
              />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="h-2.5 w-14 motion-safe:animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-19 motion-safe:animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
