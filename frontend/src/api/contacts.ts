import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { activityQueryKey } from './activity'
import { apiRequest } from './client'
import type {
  ContactListItem,
  ContactListResponse,
  ContactRequest,
  ContactUpdateRequest,
} from './types'

export const contactsQueryKey = ['contacts'] as const

const contactsQueryOptions = queryOptions({
  queryKey: contactsQueryKey,
  queryFn: ({ signal }) => apiRequest<ContactListResponse>('/api/contacts', { signal }),
})

export function useContacts() {
  return useQuery(contactsQueryOptions)
}

/** There is no single-contact GET, so one contact is read from the list. */
export function useContact(userId: number) {
  return useQuery({
    ...contactsQueryOptions,
    select: (response) => response.items.find((item) => item.person.id === userId) ?? null,
  })
}

export function useAddContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactRequest) =>
      apiRequest<ContactListItem>('/api/contacts', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
  })
}

export function useUpdateContact(userId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactUpdateRequest) =>
      apiRequest<ContactListItem>(`/api/contacts/${userId}`, { method: 'PUT', body: input }),
    // Display names in activity rows follow the nickname too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: contactsQueryKey }),
        queryClient.invalidateQueries({ queryKey: activityQueryKey }),
      ]),
  })
}
