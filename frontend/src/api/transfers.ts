import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import { invalidateAfterSave } from './expenses'
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
    mutationFn: (request: TransferRequest) =>
      apiRequest<TransferResponse>('/api/transfers', { method: 'POST', body: request }),
    onSuccess: () => invalidateAfterSave(queryClient),
  })
}

export function useUpdateTransfer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: TransferUpdateRequest) =>
      apiRequest<TransferResponse>(`/api/transfers/${id}`, { method: 'PUT', body: request }),
    onSuccess: () => invalidateAfterSave(queryClient, transferQueryKey(id)),
  })
}
