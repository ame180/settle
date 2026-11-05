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
    {
      ...contact(2, 'Anna Kowalska', 'anna@example.com'),
      balances: [{ currency: 'PLN', amount: '192.92' }],
    },
    contact(3, 'Ewa Nowak', 'ewa@example.com'),
  ],
}

type Handler = (body: unknown) => Response | Promise<Response>

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
      { path: '/contacts/:userId', element: <p>Contact page</p> },
    ],
    entry,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddPage', () => {
  it('saves a 1:1 expense with a prefilled contact and goes back to them', async () => {
    const calls = mockApi({ 'POST /api/expenses': () => jsonResponse(201, { id: 9 }) })
    renderAdd('/add?contact=2')

    const title = await screen.findByLabelText('What was it for?')
    await waitFor(() => expect(title).toHaveFocus())
    await userEvent.type(title, 'Pizza')
    await userEvent.type(screen.getByLabelText('Amount'), '99,5')
    expect(screen.getByText('Anna owes you')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add 99.50/ }))

    expect(await screen.findByText('Contact page')).toBeInTheDocument()
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
    await userEvent.keyboard('{Escape}')
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

  it('closes the people list after each pick and reopens it from Add person', async () => {
    mockApi({})
    renderAdd()

    const search = await screen.findByPlaceholderText('Name or email')
    await waitFor(() => expect(search).toHaveFocus())
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: /Anna Kowalska/ }))

    expect(screen.queryByText('Recent')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Name or email')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Anna Kowalska' })).toBeInTheDocument()
    expect(screen.getByLabelText('What was it for?')).not.toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Add person' }))
    const reopened = screen.getByPlaceholderText('Name or email')
    expect(reopened).toHaveFocus()
    await userEvent.type(reopened, 'ewa')
    await userEvent.click(screen.getByRole('button', { name: /Ewa Nowak/ }))

    expect(screen.queryByPlaceholderText('Name or email')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Ewa Nowak' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add person' })).toHaveFocus()
  })

  it('starts on the title with the list closed when opened from a contact', async () => {
    mockApi({})
    renderAdd('/add?contact=2')

    await waitFor(() => expect(screen.getByLabelText('What was it for?')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Remove Anna Kowalska' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add person' })).toBeInTheDocument()
    expect(screen.queryByText('Recent')).not.toBeInTheDocument()
  })

  it('leaves focus alone when an add by email finishes after the list was closed', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi({
      'POST /api/contacts': () => new Promise<Response>((resolve) => (finish = resolve)),
    })
    renderAdd()

    await userEvent.type(await screen.findByPlaceholderText('Name or email'), 'jan@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: /Add jan@example.com as a new contact/ }),
    )
    // Tapping outside closes the list while the add is still saving.
    await userEvent.click(document.body)
    finish(jsonResponse(201, contact(5, 'jan@example.com', 'jan@example.com')))

    expect(
      await screen.findByRole('button', { name: 'Remove jan@example.com' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('What was it for?')).not.toHaveFocus()
    expect(screen.queryByPlaceholderText('Name or email')).not.toBeInTheDocument()
  })

  it('shows a late add-by-email error as a toast once the list is closed', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi({
      'POST /api/contacts': () => new Promise<Response>((resolve) => (finish = resolve)),
    })
    renderAdd()

    await userEvent.type(await screen.findByPlaceholderText('Name or email'), 'jan@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: /Add jan@example.com as a new contact/ }),
    )
    // Tapping outside closes the list while the add is still saving.
    await userEvent.click(document.body)
    finish(jsonResponse(503, { status: 503, title: 'Service Unavailable' }))

    expect(await screen.findByText('Couldn’t add this contact. Try again.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.queryAllByText('Couldn’t add this contact. Try again.')).toHaveLength(1)
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
    expect(screen.queryByPlaceholderText('Name or email')).not.toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/contacts')?.body).toEqual({
      email: 'jan@example.com',
    })
  })

  it('opens the Payment tab prefilled from Settle up and records the payment', async () => {
    const calls = mockApi({ 'POST /api/transfers': () => jsonResponse(201, { id: 4 }) })
    renderAdd('/add?tab=payment&contact=2&amount=192.92&payer=them')

    expect(await screen.findByRole('tab', { name: 'Payment' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('You and Anna will be settled up')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Amount'))
    await userEvent.type(screen.getByLabelText('Amount'), '100')
    expect(screen.getByText(/Anna will still owe you/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Swap who paid' }))
    expect(screen.getByText(/This adds to what Anna already owes you/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Swap who paid' }))

    await userEvent.click(screen.getByRole('button', { name: /Record 100.00/ }))

    expect(await screen.findByText('Contact page')).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/transfers')?.body).toEqual({
      payerId: 2,
      payeeId: 1,
      amount: '100.00',
      occurredOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      description: null,
    })
  })

  it('says where the two stand before an amount is typed', async () => {
    mockApi({})
    renderAdd('/add?tab=payment&contact=2')

    expect(await screen.findByText(/Anna owes you .* now\./)).toBeInTheDocument()
    // Without `payer`, the form starts in the direction that clears the balance.
    expect(screen.getByText('Anna paid you')).toBeInTheDocument()
  })

  it('keeps person and amount when switching between tabs', async () => {
    mockApi({})
    renderAdd('/add?contact=2')

    await userEvent.type(await screen.findByLabelText('Amount'), '42')
    await userEvent.click(screen.getByRole('tab', { name: 'Payment' }))

    expect(screen.getByLabelText('Amount')).toHaveValue('42.00')
    expect(screen.getByRole('button', { name: /Anna Kowalska. Change person/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Expense' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('42.00')
    expect(screen.getByRole('button', { name: 'Remove Anna Kowalska' })).toBeInTheDocument()
  })
})
