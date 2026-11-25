import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './client'
import type { AppConfig } from './types'

export function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: ({ signal }) => apiRequest<AppConfig>('/api/config', { signal }),
    staleTime: Infinity,
    retry: false,
  })
}
