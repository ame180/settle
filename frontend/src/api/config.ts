import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './client'
import type { AppConfig } from './types'

export const configQueryKey = ['config'] as const

export function useAppConfig() {
  return useQuery({
    queryKey: configQueryKey,
    queryFn: ({ signal }) => apiRequest<AppConfig>('/api/config', { signal }),
    staleTime: Infinity,
  })
}
