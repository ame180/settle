import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import type { ContactListItem, ContactListResponse } from './types'

export const contactsQueryKey = ['contacts'] as const

export type AddContactInput = {
  email: string
  nickname: string | null
}

export function useContacts() {
  return useQuery({
    queryKey: contactsQueryKey,
    queryFn: ({ signal }) => apiRequest<ContactListResponse>('/api/contacts', { signal }),
  })
}

export function useAddContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddContactInput) =>
      apiRequest<ContactListItem>('/api/contacts', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
  })
}
