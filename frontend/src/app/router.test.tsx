import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { routes } from './router'

const me = { id: 1, email: 'ame@example.com', name: 'Ame' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('router', () => {
  it('renders a not-found screen inside AppShell for unknown routes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, me)))
    renderRoutes(routes, '/nope')

    expect(
      await screen.findByRole('heading', { name: 'This page doesn’t exist' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to contacts' })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/Hey developer/)).not.toBeInTheDocument()
  })

  it('redirects unknown routes to /login when signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { status: 401, title: 'Unauthorized' })),
    )
    const router = renderRoutes(routes, '/nope?x=1')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('keeps specific routes outside AppShell matched ahead of the catch-all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, me)))
    renderRoutes(routes, '/expenses/abc')

    expect(
      await screen.findByRole('heading', { name: 'This expense doesn’t exist' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('renders the root errorElement instead of React Router’s developer page on crash', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Boom(): never {
      throw new Error('render failure')
    }
    const rootErrorElement = routes[0].errorElement
    renderRoutes(
      [
        {
          errorElement: rootErrorElement,
          children: [{ path: '/boom', element: <Boom /> }],
        },
      ],
      '/boom',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.queryByText(/Hey developer/)).not.toBeInTheDocument()
  })
})
