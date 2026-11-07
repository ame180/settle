import { describe, expect, it } from 'vitest'
import { anna, expenseItem, transferItem, viewer } from '@/test/activity'
import { describeTransfer, flattenActivityPages, groupActivityByDay } from './activityItems'

describe('groupActivityByDay', () => {
  it('groups consecutive items by calendar day, keeping their order', () => {
    const items = [
      expenseItem({ id: 3, occurredOn: '2026-10-22T00:00:00+00:00' }),
      transferItem({ id: 1, occurredOn: '2026-10-22T00:00:00+00:00' }),
      expenseItem({ id: 2, occurredOn: '2026-10-20T00:00:00+00:00' }),
      expenseItem({ id: 1, occurredOn: '2025-10-20T00:00:00+00:00' }),
    ]

    const days = groupActivityByDay(items)

    expect(days.map((day) => day.day)).toEqual(['2026-10-22', '2026-10-20', '2025-10-20'])
    expect(days[0].items.map((item) => `${item.type}-${item.id}`)).toEqual([
      'expense-3',
      'transfer-1',
    ])
  })

  it('returns no days for no items', () => {
    expect(groupActivityByDay([])).toEqual([])
  })
})

describe('flattenActivityPages', () => {
  it('drops an item repeated across pages, telling expenses and transfers apart', () => {
    const items = flattenActivityPages([
      [expenseItem({ id: 2 }), transferItem({ id: 2 })],
      [expenseItem({ id: 2 }), expenseItem({ id: 1 })],
    ])

    expect(items.map((item) => `${item.type}-${item.id}`)).toEqual([
      'expense-2',
      'transfer-2',
      'expense-1',
    ])
  })
})

describe('describeTransfer', () => {
  it('puts the viewer first as "You" and as the target "you"', () => {
    expect(describeTransfer(transferItem({ payer: anna, payee: viewer }), viewer.id)).toEqual({
      actor: 'Anna Kowalska',
      verb: 'paid you',
    })
    expect(describeTransfer(transferItem({ payer: viewer, payee: anna }), viewer.id)).toEqual({
      actor: 'You',
      verb: 'paid Anna Kowalska',
    })
  })
})
