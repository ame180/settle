import { describe, expect, it } from 'vitest'
import type { ExpenseResponse } from '@/api/types'
import { mapViolations } from './saveErrors'
import {
  buildExpenseRequest,
  draftFromExpense,
  emptyDraft,
  expenseRequestSchema,
  fieldForPath,
  type ExpenseDraft,
} from './expenseDraft'

const ME = 1
const anna = { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' }
const ewa = { id: 3, displayName: 'Ewa Nowak', email: 'ewa@example.com' }
const me = { id: ME, displayName: 'Admin', email: 'admin@example.com' }

function draft(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return {
    ...emptyDraft(ME, '2026-11-05'),
    others: [anna],
    title: ' Pizza ',
    category: 'food_and_drink',
    amount: '99,5',
    ...overrides,
  }
}

describe('buildExpenseRequest', () => {
  it('builds the request, always sending category and split type', () => {
    expect(buildExpenseRequest(draft(), ME)).toEqual({
      ok: true,
      request: {
        title: 'Pizza',
        amount: '99.50',
        payeeId: ME,
        debts: [{ payerId: ME }, { payerId: 2 }],
        occurredOn: '2026-11-05',
        splitType: 'equal',
        category: 'food_and_drink',
        description: null,
      },
    })
  })

  it('names every missing field', () => {
    expect(buildExpenseRequest(emptyDraft(ME, '2026-11-05'), ME)).toEqual({
      ok: false,
      errors: {
        people: 'Add who you split this with',
        title: 'Add what it was for',
        amount: 'Enter an amount above 0',
      },
    })
  })

  it('rejects amounts the API would', () => {
    const errorFor = (amount: string) => {
      const result = buildExpenseRequest(draft({ amount }), ME)
      return result.ok ? null : result.errors.amount
    }
    expect(errorFor('0')).toBe('Enter an amount above 0')
    expect(errorFor('1,234')).toBe('Use at most 2 decimal places')
    expect(errorFor('123456789')).toBe('That amount is too large')
  })

  it('puts split problems on the split', () => {
    const result = buildExpenseRequest(
      draft({ split: { payerId: 2, type: 'equal', excluded: [ME], values: {} } }),
      ME,
    )
    expect(result).toEqual({
      ok: false,
      errors: { split: 'You need to pay or share in this expense.' },
    })
  })
})

describe('expenseRequestSchema', () => {
  it('accepts what the API accepts and rejects a zero debt value', () => {
    const request = {
      title: 'Pizza',
      amount: '10.00',
      payeeId: 1,
      debts: [{ payerId: 1, value: '10.00' }],
      occurredOn: '2026-11-05',
      splitType: 'exact',
      category: 'general',
    }
    expect(expenseRequestSchema.safeParse(request).success).toBe(true)
    expect(
      expenseRequestSchema.safeParse({ ...request, debts: [{ payerId: 1, value: '0.00' }] })
        .success,
    ).toBe(false)
  })
})

describe('mapViolations', () => {
  it('places violations on fields and keeps the rest', () => {
    expect(
      mapViolations(
        [
          { propertyPath: 'title', title: 'This value should not be blank.' },
          { propertyPath: 'debts[0].value', title: 'This value should be positive.' },
          { propertyPath: 'occurredOn', title: 'This value is not a valid date.' },
          { propertyPath: '', title: 'Something else.' },
        ],
        fieldForPath,
      ),
    ).toEqual({
      errors: {
        title: 'This value should not be blank.',
        split: 'This value should be positive.',
        date: 'This value is not a valid date.',
      },
      unplaced: ['Something else.'],
    })
  })
})

describe('draftFromExpense', () => {
  const expense: ExpenseResponse = {
    id: 7,
    title: 'Zakupy Biedronka',
    description: 'Weekly shop',
    amount: '184.30',
    currency: 'PLN',
    payee: me,
    occurredOn: '2026-10-20T00:00:00+00:00',
    splitType: 'equal',
    category: 'groceries',
    debts: [
      { payer: me, amount: '61.44', splitValue: null },
      { payer: anna, amount: '61.43', splitValue: null },
      { payer: ewa, amount: '61.43', splitValue: null },
    ],
  }

  it('loads people, split and fields, and round-trips to the same request', () => {
    const loaded = draftFromExpense(expense, ME)
    expect(loaded.others).toEqual([anna, ewa])
    expect(loaded.occurredOn).toBe('2026-10-20')
    expect(loaded.split).toEqual({ payerId: ME, type: 'equal', excluded: [], values: {} })

    const result = buildExpenseRequest(loaded, ME)
    expect(result.ok && result.request).toMatchObject({
      title: 'Zakupy Biedronka',
      amount: '184.30',
      category: 'groceries',
      splitType: 'equal',
      description: 'Weekly shop',
      debts: [{ payerId: ME }, { payerId: 2 }, { payerId: 3 }],
    })
  })

  it('keeps someone who paid but does not share out of the split, and shares as typed', () => {
    const loaded = draftFromExpense(
      {
        ...expense,
        payee: anna,
        splitType: 'shares',
        debts: [
          { payer: me, amount: '122.87', splitValue: '2.00' },
          { payer: ewa, amount: '61.43', splitValue: '1.00' },
        ],
      },
      ME,
    )
    expect(loaded.others.map((person) => person.id)).toEqual([2, 3])
    expect(loaded.split).toEqual({
      payerId: 2,
      type: 'shares',
      excluded: [2],
      values: { [ME]: '2', 3: '1' },
    })
  })
})
