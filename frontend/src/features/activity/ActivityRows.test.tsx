import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { anna, expenseItem, transferItem, viewer } from '@/test/activity'
import { activateLocale } from '@/i18n/i18n'
import { renderRoutes } from '@/test/utils'
import { ExpenseRow, SettlementRow } from './ActivityRows'

const now = new Date(2026, 10, 5, 12, 0)

function renderRow(row: ReactElement) {
  renderRoutes([{ path: '/', element: row }], '/')
}

describe('ExpenseRow', () => {
  it('shows what the viewer lent, in green, and links to the expense', () => {
    renderRow(<ExpenseRow item={expenseItem({ id: 7, value: '1234.50' })} viewerId={viewer.id} />)

    const row = screen.getByRole('link')
    expect(row).toHaveAttribute('href', '/expenses/7')
    expect(row).toHaveTextContent('Zakupy Biedronka')
    expect(row).toHaveTextContent('You paid zł 184.30')
    const label = screen.getByText('you lent')
    expect(label).toHaveTextContent('you lent')
    expect(label.parentElement).toHaveClass('text-positive')
    expect(label.parentElement).toHaveTextContent('zł 1,234.50')
  })

  it('shows what the viewer borrowed, unsigned, with the payer named', () => {
    renderRow(
      <ExpenseRow
        item={expenseItem({ payee: anna, amount: '24.00', value: '-12.00' })}
        viewerId={viewer.id}
      />,
    )

    expect(screen.getByRole('link')).toHaveTextContent('Anna Kowalska paid zł 24.00')
    const label = screen.getByText('you borrowed')
    expect(label.parentElement).toHaveClass('text-negative')
    expect(label.parentElement).toHaveTextContent(/^you borrowed zł 12\.00$/)
  })

  it('shows other currencies with their own symbol', () => {
    renderRow(
      <ExpenseRow
        item={expenseItem({ currency: 'EUR', amount: '50.00', value: '25.00' })}
        viewerId={viewer.id}
      />,
    )

    expect(screen.getByRole('link')).toHaveTextContent('You paid €50.00 you lent €25.00')
  })

  it('labels an expense that left balances unchanged', () => {
    renderRow(<ExpenseRow item={expenseItem({ value: '0.00' })} viewerId={viewer.id} />)

    expect(screen.getByText('no balance').parentElement).toHaveClass('text-muted-foreground')
  })

  it('leads with the payer avatar by default and the category tile on request', () => {
    renderRow(
      <>
        <ExpenseRow item={expenseItem({ id: 1 })} viewerId={viewer.id} />
        <ExpenseRow
          item={expenseItem({ id: 2, category: 'transport' })}
          viewerId={viewer.id}
          lead="category"
          showDate
          now={now}
        />
      </>,
    )

    expect(screen.getAllByRole('img', { name: /./ })).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Transport' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')[1]).toHaveTextContent('20 Oct · You paid zł 184.30')
  })
})

describe('SettlementRow', () => {
  it('reads as a sentence and links to the transfer', () => {
    renderRow(<SettlementRow item={transferItem({ id: 4 })} viewerId={viewer.id} />)

    const row = screen.getByRole('link')
    expect(row).toHaveAttribute('href', '/transfers/4')
    expect(row).toHaveTextContent(/^Anna Kowalska paid you zł 150\.00$/)
  })

  it('names the viewer as the payer and can show the date', () => {
    renderRow(
      <SettlementRow
        item={transferItem({ payer: viewer, payee: anna, amount: '80.00' })}
        viewerId={viewer.id}
        showDate
        now={now}
      />,
    )

    expect(screen.getByRole('link')).toHaveTextContent('You paid Anna Kowalska zł 80.0022 Oct')
  })

  describe('in Polish', () => {
    afterEach(async () => {
      // Unmount first, so switching back doesn't update a mounted I18nProvider outside act().
      cleanup()
      await activateLocale('en')
    })

    it('renders the translated sentence with its tags filled in', async () => {
      await activateLocale('pl')
      renderRow(
        <SettlementRow
          item={transferItem({ payer: viewer, payee: anna, amount: '80.00' })}
          viewerId={viewer.id}
        />,
      )

      expect(screen.getByRole('link')).toHaveTextContent(/^Ty → Anna Kowalska: 80,00\szł$/)
    })
  })
})
