import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import { contactsQueryKey } from './contacts'
import type { ExpenseRequest, ExpenseResponse } from './types'

export const activityQueryKey = ['activity'] as const

export function expenseQueryKey(id: number) {
  return ['expenses', id] as const
}

export function fetchExpense(id: number, signal?: AbortSignal): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { signal })
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: expenseQueryKey(id),
    queryFn: ({ signal }) => fetchExpense(id, signal),
  })
}

/** Everything a saved expense or payment changes: the feed, balances and its own detail. */
export function invalidateAfterSave(queryClient: QueryClient, detailKey?: readonly unknown[]) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: activityQueryKey }),
    queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
    detailKey ? queryClient.invalidateQueries({ queryKey: detailKey }) : undefined,
  ])
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ExpenseRequest) =>
      apiRequest<ExpenseResponse>('/api/expenses', { method: 'POST', body: request }),
    onSuccess: () => invalidateAfterSave(queryClient),
  })
}

export function useUpdateExpense(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ExpenseRequest) =>
      apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { method: 'PUT', body: request }),
    onSuccess: () => invalidateAfterSave(queryClient, expenseQueryKey(id)),
  })
}
