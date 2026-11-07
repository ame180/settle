import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import { deleteIgnoringMissing, invalidateAfterChange, saveMutationKey } from './ledger'
import type { TransferRequest, TransferResponse, TransferUpdateRequest } from './types'

export function transferQueryKey(id: number) {
  return ['transfers', id] as const
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: transferQueryKey(id),
    queryFn: ({ signal }) => apiRequest<TransferResponse>(`/api/transfers/${id}`, { signal }),
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: saveMutationKey,
    mutationFn: (request: TransferRequest) =>
      apiRequest<TransferResponse>('/api/transfers', { method: 'POST', body: request }),
    onSuccess: () => invalidateAfterChange(queryClient),
  })
}

export function useUpdateTransfer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: saveMutationKey,
    mutationFn: (request: TransferUpdateRequest) =>
      apiRequest<TransferResponse>(`/api/transfers/${id}`, { method: 'PUT', body: request }),
    onSuccess: () => invalidateAfterChange(queryClient, transferQueryKey(id)),
  })
}

export function useDeleteTransfer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteIgnoringMissing(`/api/transfers/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: transferQueryKey(id), exact: true })
      return invalidateAfterChange(queryClient)
    },
  })
}
