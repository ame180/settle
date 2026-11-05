import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { ActivityItem, ContactListItem } from '@/api/types'
import { anna, expenseItem, transferItem, viewer } from '@/test/activity'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { ContactPage } from './ContactPage'

function contact(overrides: Partial<ContactListItem> = {}): ContactListItem {
  return {
    person: anna,
    nickname: null,
    name: anna.displayName,
    isRegistered: true,
    balances: [],
    lastActivityAt: '2026-10-20T12:00:00+00:00',
    ...overrides,
  }
}

function plnBalance(amount: string) {
  return [{ currency: 'PLN', amount }]
}

function stubApi(contacts: ContactListItem[], activity: ActivityItem[] | 'error' = []) {
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/me') {
      return Promise.resolve(jsonResponse(200, { id: viewer.id, email: viewer.email, name: 'Ame' }))
    }
    if (url.pathname === '/api/contacts') {
      return Promise.resolve(jsonResponse(200, { totals: [], items: contacts }))
    }
    return Promise.resolve(
      activity === 'error'
        ? jsonResponse(500, { status: 500, title: 'Internal Server Error' })
        : jsonResponse(200, activity),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderContact(userId: number | string = anna.id) {
  return renderRoutes(
    [{ path: '/contacts/:userId', element: <ContactPage /> }],
    `/contacts/${userId}`,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0), toFake: ['Date'] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ContactPage', () => {
  it('shows what they owe you with a settle-up link where they pay', async () => {
    stubApi([contact({ balances: plnBalance('192.92') })], [expenseItem()])
    renderContact()

    expect(await screen.findByRole('heading', { name: 'Anna Kowalska' })).toBeInTheDocument()
    expect(screen.getByText('anna@example.com')).toBeInTheDocument()
    expect(screen.getByText('Anna owes you')).toBeInTheDocument()
    expect(screen.getByText('192.92 zł')).toHaveClass('text-positive')
    expect(screen.getByRole('link', { name: 'Settle up' })).toHaveAttribute(
      'href',
      '/add?tab=payment&contact=2&amount=192.92&payer=them',
    )
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute(
      'href',
      '/add?contact=2',
    )
    expect(screen.getByRole('link', { name: 'Edit contact' })).toHaveAttribute(
      'href',
      '/contacts/2/edit',
    )
  })

  it('shows what you owe with a settle-up link where you pay the absolute amount', async () => {
    const longName = {
      id: 7,
      displayName: 'Aleksandra Grzegorzewska-Nowak',
      email: 'aleksandra@example.com',
    }
    stubApi([
      contact({ person: longName, name: longName.displayName, balances: plnBalance('-1535.64') }),
    ])
    renderContact(7)

    expect(await screen.findByText('You owe Aleksandra')).toBeInTheDocument()
    expect(screen.getByText('1 535.64 zł')).toHaveClass('text-negative')
    expect(screen.getByRole('link', { name: 'Settle up' })).toHaveAttribute(
      'href',
      '/add?tab=payment&contact=7&amount=1535.64&payer=me',
    )
  })

  it('reads settled up without a settle-up link when there is history but no balance', async () => {
    stubApi([contact()], [expenseItem()])
    renderContact()

    expect(await screen.findByText('You and Anna are settled up')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settle up' })).not.toBeInTheDocument()
  })

  it('shows a new contact not on Settle with no shared expenses', async () => {
    const jan = { id: 9, displayName: 'Jan', email: 'jan@example.com' }
    stubApi([contact({ person: jan, name: null, isRegistered: false })])
    renderContact(9)

    expect(await screen.findByText('No shared expenses yet')).toBeInTheDocument()
    expect(screen.getByText('Not on Settle yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No expenses with Jan' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settle up' })).not.toBeInTheDocument()
  })

  it('does not call a balance in another currency settled', async () => {
    stubApi([contact({ balances: [{ currency: 'EUR', amount: '10.00' }] })], [expenseItem()])
    renderContact()

    expect(await screen.findByText('No PLN balance')).toBeInTheDocument()
    expect(screen.queryByText(/settled up/)).not.toBeInTheDocument()
  })

  it('lists shared activity with dates in the rows and category tiles', async () => {
    stubApi(
      [contact({ balances: plnBalance('92.15') })],
      [
        transferItem({ id: 5 }),
        expenseItem({ id: 4 }),
        expenseItem({ id: 3, title: 'Sylwester', occurredOn: '2025-12-31T00:00:00+00:00' }),
      ],
    )
    renderContact()

    const list = await screen.findByRole('list')
    const rows = within(list).getAllByRole('link')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Anna Kowalska paid you 150.00 zł22 Oct')
    expect(rows[0]).toHaveAttribute('href', '/transfers/5')
    expect(rows[1]).toHaveTextContent('20 Oct · You paid 184.30 zł')
    expect(rows[2]).toHaveTextContent('31 Dec 2025 ·')
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('shows an error with retry when the activity fails', async () => {
    stubApi([contact()], 'error')
    renderContact()

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load activity")
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says the contact was not found for an unknown or invalid id', async () => {
    stubApi([contact()])
    renderContact(99)
    expect(await screen.findByRole('heading', { name: 'Contact not found' })).toBeInTheDocument()
  })
})
