import type { QueryClient } from '@tanstack/react-query'
import { activityQueryKey } from './activity'
import { ApiError, apiRequest } from './client'
import { contactsQueryKey } from './contacts'

// Shared by the expense and transfer mutations: both move balances.

/** Tags expense and payment saves, so screens can tell when one is in flight. */
export const saveMutationKey = ['save'] as const

/**
 * Everything a saved or deleted expense or payment changes: the feed and balances. These run
 * even if the user leaves the page before the request answers.
 */
export function invalidateBalances(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: activityQueryKey }),
    queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
  ])
}

/** A 404 means someone else deleted it first: the outcome the user asked for. */
export async function deleteIgnoringMissing(path: string): Promise<void> {
  try {
    await apiRequest<void>(path, { method: 'DELETE' })
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      throw error
    }
  }
}
