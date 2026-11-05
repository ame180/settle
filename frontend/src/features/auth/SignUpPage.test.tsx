import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { LoginPage } from './LoginPage'
import { SignUpPage } from './SignUpPage'

type RegisterReply = { status: number; body?: unknown }

function stubApi(registerReply: RegisterReply) {
  let isLoggedIn = false
  const fetchMock = vi.fn(async (path: string) => {
    if (path === '/api/me') {
      return isLoggedIn
        ? jsonResponse(200, { id: 7, email: 'ame@example.com', name: 'Ame' })
        : jsonResponse(401, { status: 401 })
    }
    if (path === '/api/register') {
      isLoggedIn = registerReply.status === 201
      return jsonResponse(registerReply.status, registerReply.body ?? {})
    }
    throw new Error(`Unexpected request to ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function registerCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([path]) => path === '/api/register')
}

function renderSignUp() {
  return renderRoutes(
    [
      { path: '/signup', element: <SignUpPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <div>Contacts home</div> },
    ],
    '/signup',
  )
}

async function fillForm({
  name = '',
  email = 'ame@example.com',
  password = 'correct horse',
}: { name?: string; email?: string; password?: string } = {}) {
  if (name) {
    await userEvent.type(screen.getByLabelText(/Name/), name)
  }
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SignUpPage', () => {
  it('validates email and password length before submitting', async () => {
    const fetchMock = stubApi({ status: 201 })
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm({ email: 'ame@', password: 'short' })

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(registerCalls(fetchMock)).toHaveLength(0)
  })

  it('rejects a name longer than 64 characters', async () => {
    const fetchMock = stubApi({ status: 201 })
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm({ name: 'x'.repeat(65) })

    expect(await screen.findByText('Use at most 64 characters.')).toBeInTheDocument()
    expect(registerCalls(fetchMock)).toHaveLength(0)
  })

  it('toggles password visibility', async () => {
    stubApi({ status: 201 })
    renderSignUp()

    const password = await screen.findByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('registers, sends a null name when left empty, and lands on Contacts', async () => {
    const fetchMock = stubApi({
      status: 201,
      body: { id: 7, email: 'ame@example.com', name: null },
    })
    const router = renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm({ email: '  ame@example.com ' })

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Contacts home')).toBeInTheDocument()
    const [, init] = registerCalls(fetchMock)[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ame@example.com',
      password: 'correct horse',
      name: null,
    })
  })

  it('disables the form while submitting', async () => {
    stubApi({ status: 201 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) =>
        path === '/api/register' ? new Promise<Response>(() => {}) : jsonResponse(401, {}),
      ),
    )
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm()

    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeDisabled()
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
  })

  it('shows a taken email inline with a link to sign in that keeps the email', async () => {
    stubApi({ status: 409, body: { status: 409, title: 'Conflict', detail: 'Conflict' } })
    const router = renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm({ name: 'Ame' })

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')

    await userEvent.click(screen.getByRole('link', { name: 'Sign in instead' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.getByLabelText('Email')).toHaveValue('ame@example.com')
  })

  it('shows its own message when rate limited', async () => {
    stubApi({ status: 429, body: { status: 429, title: 'Too Many Requests' } })
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many sign-up attempts from this network. Try again in an hour.',
    )
  })

  it('maps violations onto their fields with its own copy', async () => {
    stubApi({
      status: 422,
      body: {
        status: 422,
        title: 'Validation Failed',
        violations: [
          { propertyPath: 'email', title: 'This value is not a valid email address.' },
          { propertyPath: 'password', title: 'This value is too short.' },
        ],
      },
    })
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm()

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Use 8 to 64 characters.')).toBeInTheDocument()
    expect(screen.queryByText('This value is too short.')).not.toBeInTheDocument()
  })

  it('shows a generic error for other failures without the server detail', async () => {
    stubApi({ status: 500, body: { status: 500, detail: 'Internal Server Error' } })
    renderSignUp()

    await screen.findByRole('heading', { name: 'Create an account' })
    await fillForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't create your account. Try again.",
    )
  })
})
