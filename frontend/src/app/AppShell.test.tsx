import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { AppShell } from './AppShell'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppShell', () => {
  it("keeps the Contacts tab current on a contact's screen", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, { id: 1, email: 'a@example.com', name: 'A' }))),
    )
    renderRoutes(
      [
        {
          element: <AppShell />,
          children: [{ path: 'contacts/:userId', element: <p>Contact</p> }],
        },
      ],
      '/contacts/2',
    )

    expect(await screen.findByText('Contact')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Activity' })).not.toHaveAttribute('aria-current')
  })
})
