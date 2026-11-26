import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router'
import { TestI18nProvider } from '@/test/i18n'
import { jsonResponse } from '@/test/utils'
import { LoginPage } from './LoginPage'

vi.mock('@/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/auth')>('@/api/auth')
  return {
    ...actual,
    useMe: () => ({ data: null, isPending: false }),
  }
})

function renderLogin(initialEntry: InitialEntry = '/login') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <div>Feed home</div> },
      { path: '/add', element: <div>Add screen</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </TestI18nProvider>,
  )
  return router
}

function stubApi(
  loginReply: { status: number; body: unknown },
  { registrationEnabled = true, configStatus = 200 } = {},
) {
  const fetchMock = vi.fn(async (path: string) => {
    if (path === '/api/config') {
      return jsonResponse(configStatus, configStatus === 200 ? { registrationEnabled } : {})
    }
    if (path === '/api/login') {
      return jsonResponse(loginReply.status, loginReply.body)
    }
    throw new Error(`Unexpected request to ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function loginCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([path]) => path === '/api/login')
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('validates required fields before submitting', async () => {
    const fetchMock = stubApi({ status: 200, body: {} })
    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(loginCalls(fetchMock)).toHaveLength(0)
  })

  it('shows an error on invalid credentials', async () => {
    stubApi({ status: 401, body: { error: 'Invalid credentials.' } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('shows its own message when sign in is throttled', async () => {
    stubApi({ status: 429, body: { status: 429, detail: 'Too Many Requests' } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many sign-in attempts. Wait a few minutes and try again.',
    )
  })

  it('navigates home after a successful login', async () => {
    stubApi({ status: 200, body: { id: 1, email: 'alice@example.com' } })
    const router = renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Feed home')).toBeInTheDocument()
  })

  it('navigates back to the saved path including query string and hash', async () => {
    stubApi({ status: 200, body: { id: 1, email: 'alice@example.com' } })
    const router = renderLogin({
      pathname: '/login',
      state: { from: '/add?tab=payment&contact=2#note' },
    })

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/add'))
    expect(router.state.location.search).toBe('?tab=payment&contact=2')
    expect(router.state.location.hash).toBe('#note')
    expect(await screen.findByText('Add screen')).toBeInTheDocument()
  })

  it('links to sign-up when registration is open', async () => {
    stubApi({ status: 200, body: {} })
    renderLogin()

    expect(await screen.findByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  it('hides the sign-up link when registration is closed', async () => {
    const fetchMock = stubApi({ status: 200, body: {} }, { registrationEnabled: false })
    renderLogin()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/config', expect.anything()))
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
    expect(screen.queryByText(/New to Settle/)).not.toBeInTheDocument()
  })

  it('hides the sign-up link when the config fails to load', async () => {
    const fetchMock = stubApi({ status: 200, body: {} }, { configStatus: 500 })
    renderLogin()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/config', expect.anything()))
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
  })
})
