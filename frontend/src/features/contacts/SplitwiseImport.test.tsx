import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactListItem, SplitwiseImportPreview } from '@/api/types'
import { jsonResponse, renderRoutes } from '@/test/utils'
import { EditContactPage } from './EditContactPage'

const ania: ContactListItem = {
  person: { id: 2, displayName: 'Ania', email: 'anna@example.com' },
  nickname: 'Ania',
  name: 'Anna Kowalska',
  isRegistered: true,
  balances: [],
  lastActivityAt: '2026-10-20T12:00:00+00:00',
}

const preview: SplitwiseImportPreview = {
  names: ['Ame Nowak', 'Anna Kowalska'],
  mismatch: null,
  options: [
    { expenses: 137, transfers: 44, skipped: 6, balance: '9642.18' },
    { expenses: 3, transfers: 0, skipped: 184, balance: '-9642.18' },
  ],
}

type Reply = { status: number; body: unknown }

function stubApi(
  previewReply: Reply = { status: 200, body: preview },
  importReply: Reply = { status: 200, body: preview.options[0] },
) {
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    if (init?.method === 'POST' && input.endsWith('?dryRun=1')) {
      return Promise.resolve(jsonResponse(previewReply.status, previewReply.body))
    }
    if (init?.method === 'POST') {
      return Promise.resolve(jsonResponse(importReply.status, importReply.body))
    }
    return Promise.resolve(jsonResponse(200, { totals: [], items: [ania] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function importCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .filter(([input, init]) => init?.method === 'POST' && !input.endsWith('?dryRun=1'))
    .map(([input, init]) => [input, JSON.parse(String(init?.body))])
}

async function chooseFile(content = 'csv text') {
  renderRoutes(
    [{ path: '/contacts/:userId/edit', element: <EditContactPage /> }],
    '/contacts/2/edit',
  )
  await screen.findByRole('button', { name: 'Import from Splitwise' })
  await userEvent.upload(
    screen.getByTestId('splitwise-file'),
    new File([content], 'export.csv', { type: 'text/csv' }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Splitwise import', () => {
  it('waits for the user to pick their name, then imports as that person', async () => {
    const fetchMock = stubApi()
    await chooseFile()

    expect(await screen.findByText('Which one are you?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Ame Nowak'))

    expect(
      screen.getByText(/137 expenses and 44 payments between Ame Nowak and Anna Kowalska\./),
    ).toHaveTextContent(/6 skipped\. After import, Ania owes you/)

    await userEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(await screen.findByText('Imported 137 expenses and 44 payments')).toBeInTheDocument()
    expect(importCalls(fetchMock)).toEqual([
      ['/api/contacts/2/import/splitwise', { csv: 'csv text', ownColumn: 0 }],
    ])
  })

  it('switching the name switches the summary', async () => {
    stubApi()
    await chooseFile()

    await userEvent.click(await screen.findByLabelText('Anna Kowalska'))

    expect(screen.getByText(/3 expenses and 0 payments/)).toHaveTextContent(/you owe Ania/)
  })

  it('clears a failed import when the other name is picked', async () => {
    stubApi(undefined, { status: 500, body: {} })
    await chooseFile()

    await userEvent.click(await screen.findByLabelText('Ame Nowak'))
    await userEvent.click(screen.getByRole('button', { name: 'Import' }))
    expect(await screen.findByText('Couldn’t import. Nothing was added.')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Anna Kowalska'))

    expect(screen.queryByText('Couldn’t import. Nothing was added.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('offers Import anyway when the rows do not add up', async () => {
    stubApi({
      status: 200,
      body: { ...preview, mismatch: '-192.92' },
    })
    await chooseFile()

    await userEvent.click(await screen.findByLabelText('Ame Nowak'))

    expect(screen.getByText(/off by .*192\.92/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import anyway' })).toBeInTheDocument()
  })

  it('has no import button when everything is already imported', async () => {
    stubApi({
      status: 200,
      body: {
        ...preview,
        options: [preview.options[0], { expenses: 0, transfers: 0, skipped: 187, balance: '0.00' }],
      },
    })
    await chooseFile()

    await userEvent.click(await screen.findByLabelText('Anna Kowalska'))

    expect(screen.getByText('Nothing new to import.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Import/ })).not.toBeInTheDocument()
  })

  it('says once when the file is not a Splitwise export', async () => {
    stubApi({ status: 422, body: { status: 422, title: 'Unprocessable Entity' } })
    await chooseFile()

    expect(
      await screen.findByText('This file isn’t a supported Splitwise export.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose another file' })).toBeInTheDocument()
  })

  it('offers a retry when the check request fails', async () => {
    stubApi({ status: 500, body: {} })
    await chooseFile()

    expect(await screen.findByText('Couldn’t check the file.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
