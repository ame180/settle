import { useInfiniteQuery } from '@tanstack/react-query'
import { apiRequest } from './client'
import type { ActivityItem } from './types'

export const ACTIVITY_PAGE_SIZE = 20

/** Every activity query starts with this, so mutations can invalidate them all at once. */
export const activityQueryKey = ['activity'] as const

export function activityListQueryKey(contactId?: number) {
  return [...activityQueryKey, 'list', { contactId: contactId ?? null }] as const
}

export function fetchActivityPage(
  offset: number,
  contactId?: number,
  signal?: AbortSignal,
): Promise<ActivityItem[]> {
  const params = new URLSearchParams({ limit: String(ACTIVITY_PAGE_SIZE), offset: String(offset) })
  if (contactId !== undefined) {
    params.set('contactId', String(contactId))
  }
  return apiRequest<ActivityItem[]>(`/api/activity?${params}`, { signal })
}

/** Newest first, paged by offset. Pass `contactId` for the activity shared with one contact. */
export function useActivity(contactId?: number) {
  return useInfiniteQuery({
    queryKey: activityListQueryKey(contactId),
    queryFn: ({ pageParam, signal }) => fetchActivityPage(pageParam, contactId, signal),
    initialPageParam: 0,
    // The API has no total; a short page means there is nothing after it.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ACTIVITY_PAGE_SIZE
        ? undefined
        : allPages.reduce((count, page) => count + page.length, 0),
  })
}
