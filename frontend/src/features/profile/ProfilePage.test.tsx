import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MeResponse } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { EditNamePage } from './EditNamePage'
import { ProfilePage } from './ProfilePage'

function stubApi(me: MeResponse, patchReply?: { status: number; body?: unknown }) {
  let current = me
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/me' && init?.method === 'PATCH') {
      if (!patchReply || patchReply.status !== 200) {
        return jsonResponse(patchReply?.status ?? 500, patchReply?.body ?? {})
      }
      const { name } = JSON.parse(init.body as string) as { name: string }
      current = { ...current, name: name === '' ? null : name }
      return jsonResponse(200, current)
    }
    if (path === '/api/me') {
      return jsonResponse(200, current)
    }
    throw new Error(`Unexpected request to ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderProfile(initialEntry = '/profile') {
  return renderRoutes(
    [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/name', element: <EditNamePage /> },
    ],
    initialEntry,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProfilePage', () => {
  it('shows the name with the email read-only', async () => {
    stubApi({ id: 1, email: 'ame@example.com', name: 'Ame Nowak' })
    renderProfile()

    expect(await screen.findByRole('heading', { name: 'Ame Nowak' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Name\s*Ame Nowak/ })).toHaveAttribute(
      'href',
      '/profile/name',
    )
    expect(screen.queryByRole('link', { name: /Email/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Add your name')).not.toBeInTheDocument()
  })

  it('nudges to add a name when none is set', async () => {
    stubApi({ id: 1, email: 'ame@example.com', name: null })
    renderProfile()

    expect(await screen.findByRole('heading', { name: 'ame@example.com' })).toBeInTheDocument()
    expect(
      screen.getByText('Your contacts see your email until you set a name.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add your name/ })).toBeInTheDocument()
  })
})

describe('EditNamePage', () => {
  it('saves the trimmed name and confirms on Profile', async () => {
    const fetchMock = stubApi({ id: 1, email: 'ame@example.com', name: null }, { status: 200 })
    const router = renderProfile('/profile/name')

    const input = await screen.findByLabelText('Name')
    await userEvent.type(input, '  Ame Nowak ')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'))
    expect((await screen.findByText('Name saved')).closest('[aria-live]')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Ame Nowak' })).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({ name: 'Ame Nowak' })
  })

  it('clears the name when saved empty', async () => {
    const fetchMock = stubApi({ id: 1, email: 'ame@example.com', name: 'Ame' }, { status: 200 })
    renderProfile('/profile/name')

    const input = await screen.findByLabelText('Name')
    expect(input).toHaveValue('Ame')
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('heading', { name: 'ame@example.com' })).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({ name: '' })
  })

  it('rejects a name longer than 64 characters', async () => {
    const fetchMock = stubApi({ id: 1, email: 'ame@example.com', name: null }, { status: 200 })
    renderProfile('/profile/name')

    await userEvent.type(await screen.findByLabelText('Name'), 'x'.repeat(65))
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Use at most 64 characters.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })

  it('maps a name violation onto the field', async () => {
    stubApi(
      { id: 1, email: 'ame@example.com', name: null },
      {
        status: 400,
        body: { status: 400, violations: [{ propertyPath: 'name', title: 'Too long.' }] },
      },
    )
    renderProfile('/profile/name')

    await userEvent.type(await screen.findByLabelText('Name'), 'Ame')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Use at most 64 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a generic error when saving fails', async () => {
    stubApi({ id: 1, email: 'ame@example.com', name: null }, { status: 500 })
    renderProfile('/profile/name')

    await userEvent.type(await screen.findByLabelText('Name'), 'Ame')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save your name. Try again.",
    )
  })
})
