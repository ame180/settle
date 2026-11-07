import { useEffect, useRef } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ActivityListFooterProps = {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetching: boolean
  isNextPageError: boolean
  fetchNextPage: () => void
}

/** The end of an infinite activity list: spinner, retry after a failed page, or the scroll sentinel. */
export function ActivityListFooter({
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  isNextPageError,
  fetchNextPage,
}: ActivityListFooterProps) {
  if (isFetchingNextPage) {
    return (
      <div role="status" className="flex justify-center py-5 text-muted-foreground">
        <LoaderCircle className="size-6 motion-safe:animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading more activity</span>
      </div>
    )
  }
  if (isNextPageError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 pt-6">
        <p className="text-sm text-muted-foreground">Couldn't load more activity.</p>
        <Button variant="outline" size="pill" onClick={fetchNextPage}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    )
  }
  // Remounting after a background refetch re-arms the observer, which only fires on change.
  return hasNextPage && !isFetching ? <LoadMoreSentinel onVisible={fetchNextPage} /> : null
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
