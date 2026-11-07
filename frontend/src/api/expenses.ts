import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import { deleteIgnoringMissing, invalidateBalances, saveMutationKey } from './ledger'
import type { ExpenseRequest, ExpenseResponse } from './types'

export function expenseQueryKey(id: number) {
  return ['expenses', id] as const
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: expenseQueryKey(id),
    queryFn: ({ signal }) => apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { signal }),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: saveMutationKey,
    mutationFn: (request: ExpenseRequest) =>
      apiRequest<ExpenseResponse>('/api/expenses', { method: 'POST', body: request }),
    onSuccess: () => invalidateBalances(queryClient),
  })
}

export function useUpdateExpense(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: saveMutationKey,
    mutationFn: (request: ExpenseRequest) =>
      apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { method: 'PUT', body: request }),
    onSuccess: () => invalidateBalances(queryClient, expenseQueryKey(id)),
  })
}

export function useDeleteExpense(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteIgnoringMissing(`/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: expenseQueryKey(id), exact: true })
      return invalidateBalances(queryClient)
    },
  })
}
