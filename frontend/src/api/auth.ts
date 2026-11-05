import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest } from './client'
import type { MeResponse } from './types'

export const meQueryKey = ['me'] as const

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
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
    },
  })
}

export type RegisterInput = {
  email: string
  password: string
  name: string | null
}

export function register(input: RegisterInput): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/register', { method: 'POST', body: input })
}

export function updateMe(input: { name: string }): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/me', { method: 'PATCH', body: input })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (me) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
      queryClient.setQueryData(meQueryKey, me)
      return queryClient.invalidateQueries({ queryKey: meQueryKey })
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me)
    },
  })
}
