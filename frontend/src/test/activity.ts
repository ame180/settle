import type { ActivityItem, PersonRef } from '@/api/types'

export const viewer: PersonRef = { id: 1, displayName: 'Ame', email: 'ame@example.com' }
export const anna: PersonRef = { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' }

export function expenseItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'expense',
    id: 1,
    occurredOn: '2026-10-20T00:00:00+00:00',
    currency: 'PLN',
    amount: '184.30',
    value: '92.15',
    title: 'Zakupy Biedronka',
    description: null,
    payee: viewer,
    payer: null,
    category: 'groceries',
    ...overrides,
  }
}

export function transferItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'transfer',
    id: 1,
    occurredOn: '2026-10-22T00:00:00+00:00',
    currency: 'PLN',
    amount: '150.00',
    value: '-150.00',
    title: null,
    description: null,
    payee: viewer,
    payer: anna,
    category: null,
    ...overrides,
  }
}
