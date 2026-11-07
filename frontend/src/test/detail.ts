import type { ExpenseResponse, PersonRef, TransferResponse } from '@/api/types'
import { anna, viewer } from './activity'

export const ewa: PersonRef = { id: 4, displayName: 'Ewa Nowak', email: 'ewa@example.com' }

export function expenseResponse(overrides: Partial<ExpenseResponse> = {}): ExpenseResponse {
  return {
    id: 7,
    title: 'Zakupy Biedronka',
    description: 'Weekly shop for the flat, incl. cleaning stuff.',
    amount: '184.30',
    currency: 'PLN',
    payee: viewer,
    occurredOn: '2026-10-20T00:00:00+00:00',
    splitType: 'equal',
    category: 'groceries',
    debts: [
      { payer: viewer, amount: '61.44', splitValue: null },
      { payer: anna, amount: '61.43', splitValue: null },
      { payer: ewa, amount: '61.43', splitValue: null },
    ],
    ...overrides,
  }
}

export function transferResponse(overrides: Partial<TransferResponse> = {}): TransferResponse {
  return {
    id: 3,
    payer: anna,
    payee: viewer,
    amount: '150.00',
    currency: 'PLN',
    occurredOn: '2026-10-22T00:00:00+00:00',
    description: 'BLIK for groceries and coffee',
    ...overrides,
  }
}
