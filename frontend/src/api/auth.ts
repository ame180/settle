import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest } from './client'
import type { MeResponse } from './types'

export const meQueryKey = ['me'] as const

/** Signs the SPA out locally: no user, and no cached data of theirs left for the next one. */
export function clearSession(queryClient: QueryClient) {
  queryClient.setQueryData(meQueryKey, null)
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== meQueryKey[0] })
}

export function fetchMe(signal?: AbortSignal): Promise<MeResponse | null> {
  return apiRequest<MeResponse>('/api/me', { signal }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  })
}

export function login(email: string, password: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/login', { method: 'POST', body: { email, password } })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/logout', { method: 'POST' })
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => clearSession(queryClient),
  })
}
