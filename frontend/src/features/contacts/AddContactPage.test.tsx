import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { AddContactPage } from './AddContactPage'
import { ContactsPage } from './ContactsPage'

function renderAddContact() {
  return renderRoutes(
    [
      { path: '/contacts/new', element: <AddContactPage /> },
      { path: '/', element: <ContactsPage /> },
    ],
    '/contacts/new',
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddContactPage', () => {
  it('validates the email before submitting', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), 'jan.nowak@')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a problem detail without violations under the email field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          status: 400,
          title: 'Bad Request',
          detail: 'You cannot add yourself as a contact.',
        }),
      ),
    )
    renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    expect(await screen.findByText('You cannot add yourself as a contact.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('maps field violations onto their inputs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          status: 400,
          title: 'Validation Failed',
          violations: [{ propertyPath: 'nickname', title: 'This value is too long.' }],
        }),
      ),
    )
    renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), 'jan@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    expect(await screen.findByText('This value is too long.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nickname/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a generic error when the request fails unexpectedly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), 'jan@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't add contact. Try again.")
  })

  it('sends a trimmed payload and returns to contacts with a confirmation', async () => {
    const fetchMock = vi.fn().mockImplementation((_path: string, init: RequestInit) => {
      if (init.method === 'POST') {
        return Promise.resolve(
          jsonResponse(201, {
            person: { id: 5, displayName: 'Jan', email: 'jan@example.com' },
            nickname: 'Jan',
            name: null,
            isRegistered: false,
            balances: [],
          }),
        )
      }
      return Promise.resolve(jsonResponse(200, { totals: [], items: [] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const router = renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), '  jan@example.com ')
    await userEvent.type(screen.getByLabelText(/Nickname/), ' Jan ')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('status')).toHaveTextContent('Jan added to your contacts')

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/contacts')
    expect(init.body).toBe(JSON.stringify({ email: 'jan@example.com', nickname: 'Jan' }))
  })

  it('sends a null nickname when left empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        person: { id: 5, displayName: 'jan@example.com', email: 'jan@example.com' },
        nickname: null,
        name: null,
        isRegistered: false,
        balances: [],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderAddContact()

    await userEvent.type(screen.getByLabelText('Email'), 'jan@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify({ email: 'jan@example.com', nickname: null }))
  })
})
