import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactListItem, ContactListResponse } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { ContactsPage } from './ContactsPage'

function contact(
  id: number,
  displayName: string,
  plnAmount: string | null,
  isRegistered = true,
): ContactListItem {
  return {
    person: { id, displayName, email: `user${id}@example.com` },
    nickname: null,
    name: displayName,
    isRegistered,
    balances: plnAmount === null ? [] : [{ currency: 'PLN', amount: plnAmount }],
  }
}

function stubContacts(response: ContactListResponse) {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, response)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderContacts(state?: unknown) {
  return renderRoutes(
    [{ path: '/', element: <ContactsPage /> }],
    state === undefined ? '/' : { pathname: '/', state },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ContactsPage', () => {
  it('shows the net total and contacts with a balance, hiding settled ones', async () => {
    stubContacts({
      totals: [{ currency: 'PLN', amount: '2072.92' }],
      items: [
        contact(1, 'Anna Kowalska', '192.92'),
        contact(2, 'Bartek', '2000.00', false),
        contact(3, 'Julia Mazur', null),
        contact(4, 'Tomasz Wiśniewski', '-120.00'),
      ],
    })
    renderContacts()

    expect(await screen.findByText(/Overall, you are owed/)).toHaveTextContent(
      'Overall, you are owed 2 072.92 zł',
    )
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Anna Kowalska')
    expect(rows[0]).toHaveTextContent('owes you192.92 zł')
    expect(rows[1]).toHaveTextContent('Not on Settle yet')
    expect(rows[2]).toHaveTextContent('you owe120.00 zł')
    expect(screen.queryByText('Julia Mazur')).not.toBeInTheDocument()
    expect(screen.getByText('Settled-up contacts are hidden.')).toBeInTheDocument()
  })

  it('toggles the settled-up section', async () => {
    stubContacts({
      totals: [{ currency: 'PLN', amount: '-5.00' }],
      items: [contact(1, 'Anna Kowalska', '-5.00'), contact(3, 'Julia Mazur', null)],
    })
    renderContacts()

    expect(await screen.findByText(/Overall, you owe/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show 1 settled-up contact' }))

    const settledSection = screen.getByRole('region', { name: 'Settled up' })
    expect(within(settledSection).getByText('Julia Mazur')).toBeInTheDocument()
    expect(within(settledSection).getByText('settled up')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hide settled-up contacts' }))
    expect(screen.queryByText('Julia Mazur')).not.toBeInTheDocument()
  })

  it('shows the all-settled state when no contact has a PLN balance', async () => {
    stubContacts({
      totals: [{ currency: 'EUR', amount: '3.00' }],
      items: [
        contact(1, 'Anna Kowalska', null),
        { ...contact(2, 'Kasia', null), balances: [{ currency: 'EUR', amount: '3.00' }] },
      ],
    })
    renderContacts()

    expect(await screen.findByText('You are all settled up')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing to settle' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show 2 settled-up contacts' }))
    expect(screen.getByText('Kasia')).toBeInTheDocument()
  })

  it('shows the empty state for a user without contacts', async () => {
    stubContacts({ totals: [], items: [] })
    renderContacts()

    expect(await screen.findByRole('heading', { name: 'No contacts yet' })).toBeInTheDocument()
    const addContactLinks = screen.getAllByRole('link', { name: 'Add contact' })
    expect(addContactLinks).toHaveLength(2)
    for (const link of addContactLinks) {
      expect(link).toHaveAttribute('href', '/contacts/new')
    }
  })

  it('shows an error with a working retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { status: 500, title: 'Internal Server Error' }))
      .mockResolvedValueOnce(jsonResponse(200, { totals: [], items: [] }))
    vi.stubGlobal('fetch', fetchMock)
    renderContacts()

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load contacts")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'No contacts yet' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('confirms a newly added contact with a toast that disappears', async () => {
    stubContacts({ totals: [], items: [contact(5, 'Jan', null, false)] })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderContacts({ addedContactName: 'Jan' })

    expect(await screen.findByRole('status')).toHaveTextContent('Jan added to your contacts')

    await vi.advanceTimersByTimeAsync(4000)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
})
