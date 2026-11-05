import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { expenseItem } from '@/test/activity'
import { jsonResponse } from '@/test/utils'
import { useActivity } from './activity'

function renderActivity(contactId?: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useActivity(contactId), { wrapper }), queryClient }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useActivity', () => {
  it('pages by offset and stops after a short page', async () => {
    const fullPage = Array.from({ length: 20 }, (_, index) => expenseItem({ id: 40 - index }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, fullPage))
      .mockResolvedValueOnce(jsonResponse(200, [expenseItem({ id: 1 })]))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderActivity()

    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    await result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/activity?limit=20&offset=0',
      '/api/activity?limit=20&offset=20',
    ])
  })

  it('filters by contact under its own activity key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchMock)
    const { result, queryClient } = renderActivity(7)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/activity?limit=20&offset=0&contactId=7',
      expect.anything(),
    )
    expect(queryClient.getQueryCache().findAll({ queryKey: ['activity'] })[0]?.queryKey).toEqual([
      'activity',
      'list',
      { contactId: 7 },
    ])
  })
})
