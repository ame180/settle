import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ActivityItem } from '@/api/types'
import { anna, expenseItem, transferItem, viewer } from '@/test/activity'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { ActivityPage } from './ActivityPage'

function stubApi(activityPages: Record<string, ActivityItem[] | 'error'>) {
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/me') {
      return Promise.resolve(jsonResponse(200, { id: viewer.id, email: viewer.email, name: 'Ame' }))
    }
    const page = activityPages[url.searchParams.get('offset') ?? '']
    return Promise.resolve(
      page === 'error' || page === undefined
        ? jsonResponse(500, { status: 500, title: 'Internal Server Error' })
        : jsonResponse(200, page),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function activityRequests(fetchMock: ReturnType<typeof stubApi>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((input) => input.startsWith('/api/activity'))
}

/** Reports every observed element as visible right away, like a sentinel already on screen. */
function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }
      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
      }
      disconnect() {}
    },
  )
}

function fullPage(startId: number): ActivityItem[] {
  return Array.from({ length: 20 }, (_, index) =>
    expenseItem({ id: startId - index, title: `Expense ${startId - index}` }),
  )
}

beforeEach(() => {
  // Only Date is faked, so the day labels stay fixed without stalling timers.
  vi.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ActivityPage', () => {
  it('groups expenses and transfers under day headers', async () => {
    stubApi({
      '0': [
        transferItem({ id: 1, occurredOn: '2026-10-22T00:00:00+00:00' }),
        expenseItem({ id: 2, occurredOn: '2026-10-20T00:00:00+00:00', payee: anna, value: '-5' }),
        expenseItem({ id: 1, occurredOn: '2026-10-20T00:00:00+00:00' }),
      ],
    })
    renderRoutes([{ path: '/', element: <ActivityPage /> }], '/')

    const firstDay = await screen.findByRole('region', { name: 'Thu, 22 Oct' })
    expect(within(firstDay).getByRole('heading')).toHaveTextContent('Thu, 22 Oct')
    expect(within(firstDay).getByRole('link')).toHaveTextContent('Anna Kowalska paid you')

    const secondDay = screen.getByRole('region', { name: 'Tue, 20 Oct' })
    const rows = within(secondDay).getAllByRole('link')
    expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/expenses/2', '/expenses/1'])
    expect(rows[0]).toHaveTextContent('you borrowed')
    expect(rows[1]).toHaveTextContent('you lent')
  })

  it('loads the next page by offset when the end of the list comes into view', async () => {
    stubIntersectionObserver()
    const fetchMock = stubApi({
      '0': fullPage(40),
      '20': [expenseItem({ id: 5, title: 'Oldest expense' })],
    })
    renderRoutes([{ path: '/', element: <ActivityPage /> }], '/')

    expect(await screen.findByText('Oldest expense')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(21)
    expect(activityRequests(fetchMock)).toEqual([
      '/api/activity?limit=20&offset=0',
      '/api/activity?limit=20&offset=20',
    ])
  })

  it('offers a retry when a later page fails, keeping what loaded', async () => {
    stubIntersectionObserver()
    const fetchMock = stubApi({ '0': fullPage(40), '20': 'error' })
    renderRoutes([{ path: '/', element: <ActivityPage /> }], '/')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load more activity.")
    expect(screen.getAllByRole('listitem')).toHaveLength(20)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(activityRequests(fetchMock).filter((url) => url.endsWith('offset=20'))).toHaveLength(2)
  })

  it('shows the empty state for a new user', async () => {
    stubApi({ '0': [] })
    renderRoutes([{ path: '/', element: <ActivityPage /> }], '/')

    expect(await screen.findByRole('heading', { name: 'No activity yet' })).toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    const pages: Record<string, ActivityItem[] | 'error'> = { '0': 'error' }
    stubApi(pages)
    renderRoutes([{ path: '/', element: <ActivityPage /> }], '/')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load activity")
    pages['0'] = []
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'No activity yet' })).toBeInTheDocument()
  })
})
