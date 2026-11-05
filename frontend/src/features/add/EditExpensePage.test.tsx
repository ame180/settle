import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
    expect(screen.getByText('Split by shares')).toBeInTheDocument()
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
    })
  })
})
