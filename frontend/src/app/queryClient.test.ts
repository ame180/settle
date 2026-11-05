import { afterEach, describe, expect, it, vi } from 'vitest'
import { meQueryKey } from '@/api/auth'
import { ApiError } from '@/api/client'
import { createQueryClient } from './queryClient'

afterEach(() => {
  vi.useRealTimers()
})

describe('createQueryClient', () => {
  it('clears the session and cached data when a query fails with 401', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(meQueryKey, { id: 1, email: 'a@b.c', name: null })
    queryClient.setQueryData(['activity'], [])

    await queryClient
      .fetchQuery({
        queryKey: ['contacts'],
        queryFn: () => Promise.reject(new ApiError(401, {})),
        retry: false,
      })
      .catch(() => undefined)

    expect(queryClient.getQueryData(meQueryKey)).toBeNull()
    expect(queryClient.getQueryData(['activity'])).toBeUndefined()
  })

  it('clears the session when a mutation fails with 401', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(meQueryKey, { id: 1, email: 'a@b.c', name: null })

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(new ApiError(401, {})) })
      .execute(undefined)
      .catch(() => undefined)

    expect(queryClient.getQueryData(meQueryKey)).toBeNull()
  })

  it('keeps the session on other errors', async () => {
    const queryClient = createQueryClient()
    const me = { id: 1, email: 'a@b.c', name: null }
    queryClient.setQueryData(meQueryKey, me)

    await queryClient
      .fetchQuery({
        queryKey: ['contacts'],
        queryFn: () => Promise.reject(new ApiError(403, {})),
        retry: false,
      })
      .catch(() => undefined)

    expect(queryClient.getQueryData(meQueryKey)).toEqual(me)
  })

  it.each([
    [new ApiError(404, {}), 0, false],
    [new ApiError(422, {}), 0, false],
    [new ApiError(502, {}), 0, true],
    [new ApiError(502, {}), 1, false],
    [new TypeError('Failed to fetch'), 0, true],
  ])('retries %s after %i failures: %s', (error, failureCount, expected) => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry
    if (typeof retry !== 'function') {
      throw new Error('retry should be a function')
    }
    expect(retry(failureCount, error)).toBe(expected)
  })
})
