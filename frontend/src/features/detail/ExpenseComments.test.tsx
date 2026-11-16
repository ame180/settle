import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { CommentResponse } from '@/api/types'
import { anna, viewer } from '@/test/activity'
import { expenseResponse } from '@/test/detail'
import { stubDetailApi } from '@/test/stubDetailApi'
import { renderRoutes } from '@/test/utils'
import { ExpenseDetailPage } from './ExpenseDetailPage'

vi.mock('sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('sonner')>()),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

function comment(overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: 1,
    author: anna,
    body: 'Was the cleaning stuff for the flat too?',
    createdAt: new Date(2026, 10, 5, 9, 15).toISOString(),
    ...overrides,
  }
}

function renderExpense() {
  return renderRoutes([{ path: '/expenses/:id', element: <ExpenseDetailPage /> }], ['/expenses/7'])
}

function commentsSection() {
  return screen.getByRole('region', { name: 'Comments' })
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('expense comments', () => {
  it('lists comments in the order the API sends, with the viewer as "You"', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': {
        status: 200,
        body: [
          comment({ createdAt: new Date(2026, 10, 4, 20, 0).toISOString() }),
          comment({ id: 2, author: viewer, body: 'Yes' }),
        ],
      },
    })
    renderExpense()

    const items = await within(
      await screen.findByRole('region', { name: 'Comments' }),
    ).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Anna KowalskaYesterday, 20:00Was the cleaning stuff')
    expect(items[1]).toHaveTextContent('YouToday, 09:15Yes')
  })

  it('says when there are no comments yet', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': { status: 200, body: [] },
    })
    renderExpense()

    expect(await screen.findByText('No comments yet.')).toBeInTheDocument()
  })

  it('offers to try again when comments fail to load', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': { status: 500, body: { status: 500, title: 'Oops' } },
    })
    renderExpense()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load comments')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('posts a trimmed comment, shows it and clears the input', async () => {
    const posted = comment({ id: 3, author: viewer, body: 'Paid by card' })
    const fetchMock = stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': { status: 200, body: [] },
      'POST /api/expenses/7/comments': { status: 201, body: posted },
    })
    renderExpense()

    const input = await screen.findByRole('textbox', { name: 'Comment' })
    const send = screen.getByRole('button', { name: 'Send comment' })
    expect(send).toBeDisabled()

    await userEvent.type(input, '  Paid by card  {Enter}')

    expect(await within(commentsSection()).findByText('Paid by card')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/expenses/7/comments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'Paid by card' }) }),
    )
  })

  it('reloads the list after posting when it had failed to load', async () => {
    const posted = comment({ id: 3, author: viewer, body: 'Paid by card' })
    const routes: Parameters<typeof stubDetailApi>[0] = {
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': { status: 500, body: { status: 500, title: 'Oops' } },
      'POST /api/expenses/7/comments': { status: 201, body: posted },
    }
    stubDetailApi(routes)
    renderExpense()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load comments')
    routes['GET /api/expenses/7/comments'] = { status: 200, body: [comment(), posted] }
    await userEvent.type(screen.getByRole('textbox', { name: 'Comment' }), 'Paid by card{Enter}')

    const items = await within(commentsSection()).findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Was the cleaning stuff'),
      expect.stringContaining('Paid by card'),
    ])
  })

  it('keeps the text and says so when sending fails', async () => {
    stubDetailApi({
      'GET /api/expenses/7': { status: 200, body: expenseResponse() },
      'GET /api/expenses/7/comments': { status: 200, body: [] },
      'POST /api/expenses/7/comments': { status: 500, body: { status: 500, title: 'Oops' } },
    })
    renderExpense()

    const input = await screen.findByRole('textbox', { name: 'Comment' })
    await userEvent.type(input, 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send comment' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Couldn’t send the comment. Try again.'),
    )
    expect(input).toHaveValue('Hello')
  })
})
