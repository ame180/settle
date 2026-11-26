import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ExpenseResponse } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { EditExpensePage } from './EditExpensePage'

const me = { id: 1, email: 'me@example.com', name: 'Me' }
const meRef = { id: 1, displayName: 'Me', email: 'me@example.com' }
const anna = { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' }
const expense: ExpenseResponse = {
  id: 7,
  title: 'Kino',
  description: null,
  amount: '60.00',
  currency: 'PLN',
  payee: meRef,
  occurredOn: '2026-10-20T00:00:00+00:00',
  splitType: 'shares',
  category: 'entertainment',
  debts: [
    { payer: meRef, amount: '40.00', splitValue: '2.00' },
    { payer: anna, amount: '20.00', splitValue: '1.00' },
  ],
  repeat: null,
  series: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditExpensePage', () => {
  it('loads the expense and PUTs it back with category and split type', async () => {
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${path}`
      if (key === 'GET /api/me') return jsonResponse(200, me)
      if (key === 'GET /api/contacts') return jsonResponse(200, { totals: [], items: [] })
      if (key === 'GET /api/expenses/7') return jsonResponse(200, expense)
      if (key === 'PUT /api/expenses/7') return jsonResponse(200, expense)
      throw new Error(`Unexpected ${key}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRoutes(
      [
        { path: '/expenses/:id/edit', element: <EditExpensePage /> },
        { path: '/expenses/:id', element: <p>Expense detail</p> },
      ],
      '/expenses/7/edit',
    )

    const title = await screen.findByLabelText('What was it for?')
    expect(title).toHaveValue('Kino')
    expect(screen.getByRole('radio', { name: /Custom/ })).toBeChecked()
    expect(screen.getByText('By shares · You 2, Anna 1')).toBeInTheDocument()
    expect(screen.getByText('Anna will see your changes.')).toBeInTheDocument()

    await userEvent.type(title, ' IMAX')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Expense detail')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      title: 'Kino IMAX',
      amount: '60.00',
      payeeId: 1,
      debts: [
        { payerId: 1, value: '2.00' },
        { payerId: 2, value: '1.00' },
      ],
      occurredOn: '2026-10-20',
      splitType: 'shares',
      category: 'entertainment',
      description: null,
      repeat: null,
    })
  })

  it('edits the repeat of the latest, saying the next one copies the changes', async () => {
    const latest: ExpenseResponse = {
      ...expense,
      repeat: { unit: 'month', every: 1, nextOn: '2026-11-20T00:00:00+00:00', active: true },
      series: { latestId: 7, isLatest: true },
    }
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${path}`
      if (key === 'GET /api/me') return jsonResponse(200, me)
      if (key === 'GET /api/contacts') return jsonResponse(200, { totals: [], items: [] })
      if (key === 'GET /api/expenses/7') return jsonResponse(200, latest)
      if (key === 'PUT /api/expenses/7') return jsonResponse(200, latest)
      throw new Error(`Unexpected ${key}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRoutes(
      [
        { path: '/expenses/:id/edit', element: <EditExpensePage /> },
        { path: '/expenses/:id', element: <p>Expense detail</p> },
      ],
      '/expenses/7/edit',
    )

    const dateChip = await screen.findByRole('button', { name: /· Monthly$/ })
    expect(
      screen.getByText(/^The next one, on 20 Nov(?: 2026)?, copies them\.$/),
    ).toBeInTheDocument()

    await userEvent.click(dateChip)
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(within(sheet).getByRole('button', { name: 'Every 2 weeks' }))
    expect(screen.getByText('The next one copies them.')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Expense detail')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body)).repeat).toEqual({ unit: 'week', every: 2 })
  })

  it('offers no repeat on an older expense of a repeat', async () => {
    const older: ExpenseResponse = {
      ...expense,
      repeat: { unit: 'month', every: 1, nextOn: '2026-11-20T00:00:00+00:00', active: true },
      series: { latestId: 9, isLatest: false },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        const key = `${init?.method ?? 'GET'} ${path}`
        if (key === 'GET /api/me') return jsonResponse(200, me)
        if (key === 'GET /api/contacts') return jsonResponse(200, { totals: [], items: [] })
        if (key === 'GET /api/expenses/7') return jsonResponse(200, older)
        throw new Error(`Unexpected ${key}`)
      }),
    )
    renderRoutes([{ path: '/expenses/:id/edit', element: <EditExpensePage /> }], '/expenses/7/edit')

    await userEvent.click(await screen.findByRole('button', { name: /^20 Oct/ }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).queryByRole('heading', { name: 'Repeat' })).not.toBeInTheDocument()
    expect(screen.queryByText(/The next one/)).not.toBeInTheDocument()
  })

  it('shows StateMessage with a way back when the expense is not found (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        if (path === '/api/me') return jsonResponse(200, me)
        return jsonResponse(404, { status: 404, title: 'Not Found' })
      }),
    )
    renderRoutes(
      [{ path: '/expenses/:id/edit', element: <EditExpensePage /> }],
      '/expenses/999999/edit',
    )

    expect(
      await screen.findByRole('heading', { name: 'This expense doesn’t exist' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to activity' })).toHaveAttribute(
      'href',
      '/activity',
    )
  })
})

describe('EditExpensePage with a malformed id', () => {
  it('shows not found without loading anything', async () => {
    const fetchMock = vi.fn(async (_path: string) => jsonResponse(200, me))
    vi.stubGlobal('fetch', fetchMock)
    renderRoutes(
      [{ path: '/expenses/:id/edit', element: <EditExpensePage /> }],
      '/expenses/abc/edit',
    )

    expect(
      await screen.findByRole('heading', { name: 'This expense doesn’t exist' }),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([path]) => String(path).startsWith('/api/expenses'))).toBe(
      false,
    )
  })
})
