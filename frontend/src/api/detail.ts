import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { activityQueryKey } from './activity'
import { apiRequest } from './client'
import { contactsQueryKey } from './contacts'
import type { ExpenseResponse, TransferResponse } from './types'

export function expenseQueryKey(id: number) {
  return ['expenses', id] as const
}

export function transferQueryKey(id: number) {
  return ['transfers', id] as const
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: expenseQueryKey(id),
    queryFn: ({ signal }) => apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { signal }),
  })
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: transferQueryKey(id),
    queryFn: ({ signal }) => apiRequest<TransferResponse>(`/api/transfers/${id}`, { signal }),
  })
}

// Balances move with every delete, so the feed and the contact list refetch.
function invalidateBalances(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: activityQueryKey }),
    queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
  ])
}

export function useDeleteExpense(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateBalances(queryClient),
  })
}

export function useDeleteTransfer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest<void>(`/api/transfers/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateBalances(queryClient),
  })
}
