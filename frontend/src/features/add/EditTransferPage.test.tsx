import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TransferResponse } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { EditTransferPage } from './EditTransferPage'

const me = { id: 1, email: 'me@example.com', name: 'Me' }
const anna = { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' }
const transfer: TransferResponse = {
  id: 6,
  payer: anna,
  payee: { id: 1, displayName: 'Me', email: 'me@example.com' },
  amount: '50.00',
  currency: 'PLN',
  occurredOn: '2026-11-01T00:00:00+00:00',
  description: 'BLIK',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditTransferPage', () => {
  it('shows the balance without this payment and PUTs amount, date and note', async () => {
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${path}`
      if (key === 'GET /api/me') return jsonResponse(200, me)
      if (key === 'GET /api/contacts')
        return jsonResponse(200, {
          totals: [],
          items: [
            {
              person: anna,
              nickname: null,
              name: 'Anna Kowalska',
              isRegistered: true,
              // Already includes this 50.00 payment: 150.00 before it.
              balances: [{ currency: 'PLN', amount: '100.00' }],
              lastActivityAt: '2026-11-01T00:00:00+00:00',
            },
          ],
        })
      if (key === 'GET /api/transfers/6') return jsonResponse(200, transfer)
      if (key === 'PUT /api/transfers/6') return jsonResponse(200, transfer)
      throw new Error(`Unexpected ${key}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRoutes(
      [
        { path: '/transfers/:id/edit', element: <EditTransferPage /> },
        { path: '/transfers/:id', element: <p>Payment detail</p> },
      ],
      '/transfers/6/edit',
    )

    expect(await screen.findByText(/Anna will still owe you 100.00/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap who paid' })).toBeDisabled()

    await userEvent.clear(screen.getByLabelText('Amount'))
    await userEvent.type(screen.getByLabelText('Amount'), '150')
    expect(screen.getByText('You and Anna will be settled up')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Payment detail')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      amount: '150.00',
      occurredOn: '2026-11-01',
      description: 'BLIK',
    })
  })
})
