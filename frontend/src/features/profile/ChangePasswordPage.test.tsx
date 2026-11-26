import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { ChangePasswordPage } from './ChangePasswordPage'
import { ProfilePage } from './ProfilePage'

function stubApi(passwordReply: { status: number; body?: unknown }) {
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/me/password' && init?.method === 'PUT') {
      return passwordReply.status === 204
        ? new Response(null, { status: 204 })
        : jsonResponse(passwordReply.status, passwordReply.body ?? {})
    }
    if (path === '/api/me') {
      return jsonResponse(200, { id: 1, email: 'ame@example.com', name: 'Ame' })
    }
    throw new Error(`Unexpected request to ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function passwordCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([path]) => path === '/api/me/password')
}

function renderChangePassword() {
  return renderRoutes(
    [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/password', element: <ChangePasswordPage /> },
    ],
    ['/profile', '/profile/password'],
  )
}

async function fillForm({
  current = 'temporary-pass',
  next = 'lemon-tram-42',
  repeat = next,
}: { current?: string; next?: string; repeat?: string } = {}) {
  if (current) {
    await userEvent.type(screen.getByLabelText('Current password'), current)
  }
  if (next) {
    await userEvent.type(screen.getByLabelText('New password'), next)
  }
  if (repeat) {
    await userEvent.type(screen.getByLabelText('Repeat new password'), repeat)
  }
  await userEvent.click(screen.getByRole('button', { name: 'Save password' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChangePasswordPage', () => {
  it('is linked from a Password row on Profile', async () => {
    stubApi({ status: 204 })
    renderRoutes([{ path: '/profile', element: <ProfilePage /> }], '/profile')

    expect(await screen.findByRole('link', { name: 'Password' })).toHaveAttribute(
      'href',
      '/profile/password',
    )
  })

  it('changes the password and confirms on Profile', async () => {
    const fetchMock = stubApi({ status: 204 })
    const router = renderChangePassword()

    await fillForm()

    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'))
    expect((await screen.findByText('Password changed')).closest('[aria-live]')).not.toBeNull()
    const [, init] = passwordCalls(fetchMock)[0]
    expect(JSON.parse(init?.body as string)).toEqual({
      currentPassword: 'temporary-pass',
      newPassword: 'lemon-tram-42',
    })
  })

  it('checks every field before submitting', async () => {
    const fetchMock = stubApi({ status: 204 })
    renderChangePassword()

    await fillForm({ current: '', next: 'short', repeat: 'shorter' })

    expect(await screen.findByText('Enter your current password.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument()
    expect(screen.getByLabelText('Repeat new password')).toHaveAttribute('aria-invalid', 'true')
    expect(passwordCalls(fetchMock)).toHaveLength(0)
  })

  it('rejects a repeat that differs from the new password', async () => {
    const fetchMock = stubApi({ status: 204 })
    renderChangePassword()

    await fillForm({ repeat: 'lemon-tram-43' })

    expect(await screen.findByText("The passwords don't match.")).toBeInTheDocument()
    expect(passwordCalls(fetchMock)).toHaveLength(0)
  })

  it('puts a wrong current password on its field and keeps the values', async () => {
    stubApi({
      status: 400,
      body: { status: 400, violations: [{ propertyPath: 'currentPassword', title: 'Wrong.' }] },
    })
    renderChangePassword()

    await fillForm()

    expect(await screen.findByText("That isn't your current password.")).toBeInTheDocument()
    const currentPassword = screen.getByLabelText('Current password')
    expect(currentPassword).toHaveAttribute('aria-invalid', 'true')
    expect(currentPassword).toHaveFocus()
    expect(currentPassword).toHaveValue('temporary-pass')
    expect(screen.getByLabelText('New password')).toHaveValue('lemon-tram-42')
  })

  it('says to wait when there were too many attempts', async () => {
    stubApi({ status: 429, body: { status: 429 } })
    renderChangePassword()

    await fillForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again later.',
    )
  })

  it('shows a generic error when the change fails', async () => {
    stubApi({ status: 500 })
    renderChangePassword()

    await fillForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't change your password. Try again.",
    )
  })
})
