import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { anna, viewer } from '@/test/activity'
import { transferResponse } from '@/test/detail'
import { stubDetailApi } from '@/test/stubDetailApi'
import { renderRoutes } from '@/test/utils'
import { TransferDetailPage } from './TransferDetailPage'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

function renderTransfer() {
  return renderRoutes(
    [
      { path: '/transfers/:id', element: <TransferDetailPage /> },
      { path: '/activity', element: <p>Activity feed</p> },
    ],
    '/transfers/3',
  )
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('TransferDetailPage', () => {
  it('shows who paid whom, the amount, date and note', async () => {
    stubDetailApi({ 'GET /api/transfers/3': { status: 200, body: transferResponse() } })
    renderTransfer()

    expect(await screen.findByText('Anna Kowalska paid you')).toBeInTheDocument()
    expect(screen.getByText('150.00 zł')).toBeInTheDocument()
    expect(screen.getByText('22 Oct')).toBeInTheDocument()
    expect(screen.getByText('BLIK for groceries and coffee')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit payment' })).toHaveAttribute(
      'href',
      '/transfers/3/edit',
    )
  })

  it('reads from the viewer’s side when they paid', async () => {
    stubDetailApi({
      'GET /api/transfers/3': {
        status: 200,
        body: transferResponse({ payer: viewer, payee: anna, description: null }),
      },
    })
    renderTransfer()

    expect(await screen.findByText('You paid Anna Kowalska')).toBeInTheDocument()
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
  })

  it('deletes after confirming and goes back', async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    stubDetailApi({
      'GET /api/transfers/3': { status: 200, body: transferResponse() },
      'DELETE /api/transfers/3': { status: 204 },
    })
    const router = renderTransfer()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete payment' }))
    const sheet = await screen.findByRole('dialog', { name: 'Delete this payment?' })
    expect(sheet).toHaveTextContent('It disappears for Anna Kowalska too')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete payment' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/activity'))
    expect(toast.success).toHaveBeenCalledWith('Payment deleted')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['activity'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['contacts'] })
  })

  it.each([
    [404, 'This payment doesn’t exist'],
    [403, 'You can’t see this payment'],
  ])('explains a %i', async (status, title) => {
    stubDetailApi({ 'GET /api/transfers/3': { status, body: { status } } })
    renderTransfer()

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  })
})
