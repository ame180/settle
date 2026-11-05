import { describe, expect, it } from 'vitest'
import { anna, viewer } from '@/test/activity'
import { ewa, expenseResponse } from '@/test/detail'
import {
  deleteWarning,
  expensePosition,
  otherParticipantNames,
  splitHeading,
  splitPeople,
} from './expenseSummary'

describe('expensePosition', () => {
  it('sums what the others owe when the viewer paid', () => {
    expect(expensePosition(expenseResponse(), viewer.id)).toEqual({
      direction: 'owed',
      label: 'You lent',
      amount: '122.86',
    })
  })

  it('takes the viewer’s own share when someone else paid', () => {
    const expense = expenseResponse({ payee: anna })
    expect(expensePosition(expense, viewer.id)).toEqual({
      direction: 'owe',
      label: 'You borrowed',
      amount: '61.44',
    })
  })

  it('reports no balance when the viewer paid only for themselves', () => {
    const expense = expenseResponse({
      debts: [{ payer: viewer, amount: '184.30', splitValue: null }],
    })
    expect(expensePosition(expense, viewer.id).direction).toBe('none')
  })
})

describe('splitPeople', () => {
  it('lists who paid first, then the rest in server order', () => {
    const expense = expenseResponse({ payee: anna })
    expect(splitPeople(expense, viewer.id).map((row) => row.name)).toEqual([
      'Anna Kowalska',
      'You',
      'Ewa Nowak',
    ])
  })

  it('keeps a payee without a share, and labels percentages and shares', () => {
    const percentage = expenseResponse({
      splitType: 'percentage',
      debts: [
        { payer: anna, amount: '73.72', splitValue: '40.00' },
        { payer: ewa, amount: '110.58', splitValue: '60' },
      ],
    })
    expect(splitPeople(percentage, viewer.id)).toMatchObject([
      { name: 'You', isPayee: true, share: null, splitLabel: null },
      { name: 'Anna Kowalska', splitLabel: '40%' },
      { name: 'Ewa Nowak', splitLabel: '60%' },
    ])

    const shares = expenseResponse({
      splitType: 'shares',
      debts: [{ payer: anna, amount: '184.30', splitValue: '1' }],
    })
    expect(splitPeople(shares, viewer.id)[1].splitLabel).toBe('1 share')
  })
})

describe('splitHeading', () => {
  it('counts people for an equal split and names the other types', () => {
    expect(splitHeading(expenseResponse())).toBe('Split equally between 3')
    expect(splitHeading(expenseResponse({ splitType: 'exact' }))).toBe('Split by amounts')
  })
})

describe('deleteWarning', () => {
  it('names everyone else in the expense', () => {
    const names = otherParticipantNames(expenseResponse(), viewer.id)
    expect(deleteWarning(names)).toBe(
      'It disappears for Anna Kowalska and Ewa Nowak too, and balances change. This can’t be undone.',
    )
    expect(deleteWarning([])).toBe('This can’t be undone.')
  })
})
