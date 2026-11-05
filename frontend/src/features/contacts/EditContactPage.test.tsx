import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactListItem } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { EditContactPage } from './EditContactPage'

const ania: ContactListItem = {
  person: { id: 2, displayName: 'Ania', email: 'anna@example.com' },
  nickname: 'Ania',
  name: 'Anna Kowalska',
  isRegistered: true,
  balances: [],
  lastActivityAt: '2026-10-20T12:00:00+00:00',
}

type PutResponse = { status: number; body: unknown }

function stubApi(putResponse: PutResponse = { status: 200, body: ania }) {
  const fetchMock = vi.fn((_input: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return Promise.resolve(jsonResponse(putResponse.status, putResponse.body))
    }
    return Promise.resolve(jsonResponse(200, { totals: [], items: [ania] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function putCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PUT')
    .map(([input, init]) => [input, JSON.parse(String(init?.body))])
}

function renderEdit() {
  return renderRoutes(
    [
      { path: '/contacts/:userId/edit', element: <EditContactPage /> },
      { path: '/contacts/:userId', element: <p>Contact view</p> },
    ],
    '/contacts/2/edit',
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditContactPage', () => {
  it('prefills the nickname and shows their own name and a read-only email', async () => {
    stubApi()
    renderEdit()

    expect(await screen.findByLabelText(/Nickname/)).toHaveValue('Ania')
    expect(screen.getByText('Anna Kowalska')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('anna@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByRole('link', { name: 'Back to Ania' })).toHaveAttribute(
      'href',
      '/contacts/2',
    )
  })

  it('saves the trimmed nickname and returns to the contact', async () => {
    const fetchMock = stubApi()
    const router = renderEdit()

    const input = await screen.findByLabelText(/Nickname/)
    await userEvent.clear(input)
    await userEvent.type(input, '  Anka ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Contact view')).toBeInTheDocument()
    expect(putCalls(fetchMock)).toEqual([['/api/contacts/2', { nickname: 'Anka' }]])
    expect(router.state.location.pathname).toBe('/contacts/2')
  })

  it('sends null for an empty nickname so their own name is used', async () => {
    const fetchMock = stubApi()
    renderEdit()

    await userEvent.clear(await screen.findByLabelText(/Nickname/))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Contact view')).toBeInTheDocument()
    expect(putCalls(fetchMock)).toEqual([['/api/contacts/2', { nickname: null }]])
  })

  it('shows a server violation on the nickname field', async () => {
    stubApi({
      status: 400,
      body: {
        status: 400,
        title: 'Validation Failed',
        violations: [{ propertyPath: 'nickname', title: 'This value is too long.' }],
      },
    })
    renderEdit()

    await screen.findByLabelText(/Nickname/)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('This value is too long.')).toBeInTheDocument()
    expect(screen.queryByText('Contact view')).not.toBeInTheDocument()
  })

  it('rejects a nickname over 64 characters before sending', async () => {
    const fetchMock = stubApi()
    renderEdit()

    const input = await screen.findByLabelText(/Nickname/)
    await userEvent.clear(input)
    await userEvent.type(input, 'x'.repeat(65))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Nickname can be at most 64 characters.')).toBeInTheDocument()
    expect(putCalls(fetchMock)).toEqual([])
  })
})
