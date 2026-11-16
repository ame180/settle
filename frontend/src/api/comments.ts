import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import type { CommentRequest, CommentResponse } from './types'

export function commentsQueryKey(expenseId: number) {
  return ['expenses', expenseId, 'comments'] as const
}

export function useComments(expenseId: number) {
  return useQuery({
    queryKey: commentsQueryKey(expenseId),
    queryFn: ({ signal }) =>
      apiRequest<CommentResponse[]>(`/api/expenses/${expenseId}/comments`, { signal }),
  })
}

export function usePostComment(expenseId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CommentRequest) =>
      apiRequest<CommentResponse>(`/api/expenses/${expenseId}/comments`, {
        method: 'POST',
        body: request,
      }),
    onSuccess: (comment) => {
      const queryKey = commentsQueryKey(expenseId)
      const comments = queryClient.getQueryData<CommentResponse[]>(queryKey)
      // A list that is missing, failed or still loading could drop the new comment; refetch it.
      if (!comments || queryClient.isFetching({ queryKey }) > 0) {
        return queryClient.invalidateQueries({ queryKey })
      }
      queryClient.setQueryData(queryKey, [...comments, comment])
    },
  })
}
