import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactListItem, ContactListResponse } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { AddPage } from './AddPage'

const me = { id: 1, email: 'me@example.com', name: 'Me' }

function contact(id: number, displayName: string, email: string): ContactListItem {
  return {
    person: { id, displayName, email },
    nickname: null,
    name: displayName,
    isRegistered: true,
    balances: [],
    lastActivityAt: '2026-11-01T10:00:00+00:00',
  }
}

const contacts: ContactListResponse = {
  totals: [],
  items: [
    contact(2, 'Anna Kowalska', 'anna@example.com'),
    contact(3, 'Ewa Nowak', 'ewa@example.com'),
  ],
}

type Handler = (body: unknown) => Response

function mockApi(handlers: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = []
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ key, body })
    if (key === 'GET /api/me') return jsonResponse(200, me)
    if (key === 'GET /api/contacts') return jsonResponse(200, contacts)
    const handler = handlers[key]
    if (!handler) throw new Error(`Unexpected request ${key}`)
    return handler(body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

function renderAdd(entry = '/add') {
  return renderRoutes(
    [
      { path: '/add', element: <AddPage /> },
      { path: '/', element: <p>Contacts page</p> },
    ],
    entry,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddPage', () => {
  it('saves a 1:1 expense with a prefilled contact and goes back', async () => {
    const calls = mockApi({ 'POST /api/expenses': () => jsonResponse(201, { id: 9 }) })
    renderAdd('/add?contact=2')

    const title = await screen.findByLabelText('What was it for?')
    await waitFor(() => expect(title).toHaveFocus())
    await userEvent.type(title, 'Pizza')
    await userEvent.type(screen.getByLabelText('Amount'), '99,5')
    expect(screen.getByText('Anna owes you')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add 99.50/ }))

    expect(await screen.findByText('Contacts page')).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/expenses')?.body).toEqual({
      title: 'Pizza',
      amount: '99.50',
      payeeId: 1,
      debts: [{ payerId: 1 }, { payerId: 2 }],
      occurredOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      splitType: 'equal',
      category: 'food_and_drink',
      description: null,
    })
  })

  it('names what is missing without calling the API', async () => {
    const calls = mockApi({})
    renderAdd()

    await screen.findByText('Recent')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(screen.getByText('Add who you split this with')).toBeInTheDocument()
    expect(screen.getByText('Add what it was for')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount above 0')).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'POST /api/expenses')).toBe(false)
  })

  it('puts server violations on their fields', async () => {
    mockApi({
      'POST /api/expenses': () =>
        jsonResponse(400, {
          status: 400,
          title: 'Validation Failed',
          violations: [{ propertyPath: 'title', title: 'This value is too long.' }],
        }),
    })
    renderAdd('/add?contact=2')

    await userEvent.type(await screen.findByLabelText('What was it for?'), 'Pizza')
    await userEvent.type(screen.getByLabelText('Amount'), '10')
    await userEvent.click(screen.getByRole('button', { name: /Add 10.00/ }))

    expect(await screen.findByText('This value is too long.')).toBeInTheDocument()
    expect(screen.getByLabelText('What was it for?')).toHaveAttribute('aria-invalid', 'true')
  })

  it('adds someone new by email', async () => {
    const calls = mockApi({
      'POST /api/contacts': () =>
        jsonResponse(201, contact(5, 'jan@example.com', 'jan@example.com')),
    })
    renderAdd()

    const input = await screen.findByPlaceholderText('Name or email')
    await userEvent.type(input, 'jan@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: /Add jan@example.com as a new contact/ }),
    )

    expect(
      await screen.findByRole('button', { name: 'Remove jan@example.com' }),
    ).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/contacts')?.body).toEqual({
      email: 'jan@example.com',
    })
  })
})
