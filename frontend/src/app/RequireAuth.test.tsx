import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { jsonResponse, renderRoutes } from '@/test/utils'
import type { LoginLocationState } from '@/features/auth/LoginPage'
import { RequireAuth } from './RequireAuth'

function LoginProbe() {
  const location = useLocation()
  const state = location.state as LoginLocationState
  return <p data-testid="login-from">{state?.from ?? ''}</p>
}

function renderProtected(initialEntry: string) {
  return renderRoutes(
    [
      { path: '/login', element: <LoginProbe /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <p>Protected home</p> },
          { path: '/add', element: <p>Add screen</p> },
        ],
      },
    ],
    initialEntry,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RequireAuth', () => {
  it('redirects to /login with pathname, search and hash on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { status: 401, title: 'Unauthorized' })),
    )
    const router = renderProtected('/add?tab=payment&contact=2#note')

    expect(await screen.findByTestId('login-from')).toHaveTextContent(
      '/add?tab=payment&contact=2#note',
    )
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows a retryable error instead of redirecting when /api/me fails with 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { status: 500, title: 'Internal Server Error' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 1, email: 'a@example.com', name: 'Ame' }))
    vi.stubGlobal('fetch', fetchMock)

    const router = renderProtected('/add')

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach Settle')
    expect(router.state.location.pathname).toBe('/add')
    expect(screen.queryByTestId('login-from')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Add screen')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows a retryable error on network failure and redirects if retry returns 401', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(401, { status: 401, title: 'Unauthorized' }))
    vi.stubGlobal('fetch', fetchMock)

    const router = renderProtected('/add?contact=2')

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach Settle')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.getByTestId('login-from')).toHaveTextContent('/add?contact=2')
  })
})
