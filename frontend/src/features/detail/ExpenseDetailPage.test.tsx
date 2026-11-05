import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { anna } from '@/test/activity'
import { expenseResponse } from '@/test/detail'
import { stubDetailApi } from '@/test/stubDetailApi'
import { renderRoutes } from '@/test/utils'
import { ExpenseDetailPage } from './ExpenseDetailPage'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

function renderExpense(history: string[] = []) {
  return renderRoutes(
    [
      { path: '/expenses/:id', element: <ExpenseDetailPage /> },
      { path: '/expenses/:id/edit', element: <p>Edit form</p> },
      { path: '/activity', element: <p>Activity feed</p> },
      { path: '/contacts/:userId', element: <p>Contact view</p> },
    ],
    [...history, '/expenses/7'],
  )
}

function personRow(name: string) {
  return screen.getByText(name, { selector: 'span' }).closest('li') as HTMLElement
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

describe('ExpenseDetailPage', () => {
  it('shows an expense the viewer paid, with what the others owe', async () => {
    stubDetailApi({ 'GET /api/expenses/7': { status: 200, body: expenseResponse() } })
    renderExpense()

    expect(await screen.findByRole('heading', { name: 'Zakupy Biedronka' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.getByText('184.30 zł')).toBeInTheDocument()
    expect(screen.getByText('20 Oct · Groceries')).toBeInTheDocument()
    expect(screen.getByText('You lent').nextSibling).toHaveTextContent('122.86 zł')
    expect(screen.getByText('Split equally between 3')).toBeInTheDocument()
    expect(personRow('You')).toHaveTextContent('Paid 184.30 zł')
    expect(personRow('You')).toHaveTextContent('61.44 zł')
    expect(personRow('Anna Kowalska')).toHaveTextContent('61.43 zł')
    expect(personRow('Anna Kowalska')).not.toHaveTextContent('Paid')
    expect(screen.getByText('Weekly shop for the flat, incl. cleaning stuff.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit expense' })).toHaveAttribute(
      'href',
      '/expenses/7/edit',
    )
  })

  it('shows an expense someone else paid, with the viewer’s share', async () => {
    stubDetailApi({
      'GET /api/expenses/7': {
        status: 200,
        body: expenseResponse({
          title: 'Kawa',
          amount: '24.00',
          category: 'food_and_drink',
          description: null,
          payee: anna,
          debts: [
            { payer: anna, amount: '12.00', splitValue: null },
            {
              payer: { id: 1, displayName: 'Ame', email: 'ame@example.com' },
              amount: '12.00',
              splitValue: null,
            },
          ],
        }),
      },
    })
    renderExpense()

    expect(await screen.findByRole('heading', { name: 'Kawa' })).toBeInTheDocument()
    expect(screen.getByText('You borrowed').nextSibling).toHaveTextContent('12.00 zł')
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Anna Kowalska')
    expect(rows[0]).toHaveTextContent('Paid 24.00 zł')
    expect(rows[1]).toHaveTextContent('You')
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
  })

  it.each([
    [404, 'This expense doesn’t exist'],
    [403, 'You can’t see this expense'],
  ])('explains a %i', async (status, title) => {
    stubDetailApi({ 'GET /api/expenses/7': { status, body: { status } } })
    renderExpense()

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit expense' })).not.toBeInTheDocument()
  })

  it('deletes after confirming, then goes back and refreshes balances', async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    const fetchMock = stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'DELETE /api/expenses/7': { status: 204 },
    })
    const router = renderExpense()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    const sheet = await screen.findByRole('dialog', { name: 'Delete “Zakupy Biedronka”?' })
    expect(sheet).toHaveTextContent('It disappears for Anna Kowalska and Ewa Nowak too')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete expense' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/activity'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/expenses/7',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['activity'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['contacts'] })
    expect(toast.success).toHaveBeenCalledWith('Expense deleted')
  })

  it('keeps the sheet open and says so when the delete fails', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'DELETE /api/expenses/7': { status: 500, body: { status: 500 } },
    })
    const router = renderExpense()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete expense' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Couldn’t delete the expense. Try again.'),
    )
    expect(router.state.location.pathname).toBe('/expenses/7')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('goes back to the contact view it came from after deleting', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'DELETE /api/expenses/7': { status: 204 },
    })
    const router = renderExpense(['/contacts/2'])

    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete expense' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts/2'))
  })

  it('treats an expense someone else already deleted as deleted', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'DELETE /api/expenses/7': { status: 404, body: { status: 404 } },
    })
    const router = renderExpense()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete expense' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/activity'))
    expect(toast.success).toHaveBeenCalledWith('Expense deleted')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('goes back with the header arrow', async () => {
    stubDetailApi({ 'GET /api/expenses/7': { status: 200, body: expenseResponse() } })
    const router = renderExpense(['/contacts/2'])

    await userEvent.click(await screen.findByRole('link', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts/2'))
  })

  it('cancels without deleting', async () => {
    const fetchMock = stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
    })
    renderExpense()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/expenses/7',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
