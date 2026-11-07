import type { ExpenseResponse, PersonRef, SplitType } from '@/api/types'
import type { BalanceDirection } from '@/features/activity/activityItems'
import { isZeroAmount, sumAmounts } from '@/lib/money'
import { trimDecimal } from '@/lib/decimal'
import { joinNames, nameForViewer, peopleOtherThan } from '@/lib/person'

export type ExpensePosition = {
  direction: BalanceDirection
  label: string
  amount: string
}

/** What the expense does to the viewer's balance, from the server's split. */
export function expensePosition(expense: ExpenseResponse, viewerId: number): ExpensePosition {
  if (expense.payee.id === viewerId) {
    const othersOwe = sumAmounts(
      expense.debts.filter((debt) => debt.payer.id !== viewerId).map((debt) => debt.amount),
    )
    return isZeroAmount(othersOwe)
      ? { direction: 'none', label: 'No balance', amount: othersOwe }
      : { direction: 'owed', label: 'You lent', amount: othersOwe }
  }

  const ownShare = expense.debts.find((debt) => debt.payer.id === viewerId)?.amount ?? '0.00'
  return isZeroAmount(ownShare)
    ? { direction: 'none', label: 'No balance', amount: ownShare }
    : { direction: 'owe', label: 'You borrowed', amount: ownShare }
}

const splitHeadings: Record<Exclude<SplitType, 'equal'>, string> = {
  exact: 'Split by amounts',
  percentage: 'Split by percentages',
  shares: 'Split by shares',
}

export function splitHeading(expense: ExpenseResponse): string {
  if (expense.splitType === 'equal') {
    return `Split equally between ${expense.debts.length}`
  }
  return splitHeadings[expense.splitType]
}

export type SplitPerson = {
  person: PersonRef
  name: string
  isPayee: boolean
  /** The person's share; null when the payee paid but has no share. */
  share: string | null
  /** "40%" or "2 shares" for those split types, else null. */
  splitLabel: string | null
}

/** Who paid comes first, then everyone else in the server's order. */
export function splitPeople(expense: ExpenseResponse, viewerId: number): SplitPerson[] {
  const payeeDebt = expense.debts.find((debt) => debt.payer.id === expense.payee.id)
  const payee: SplitPerson = {
    person: expense.payee,
    name: nameForViewer(expense.payee, viewerId),
    isPayee: true,
    share: payeeDebt?.amount ?? null,
    splitLabel: payeeDebt ? splitValueLabel(expense.splitType, payeeDebt.splitValue) : null,
  }
  const others = expense.debts
    .filter((debt) => debt.payer.id !== expense.payee.id)
    .map((debt) => ({
      person: debt.payer,
      name: nameForViewer(debt.payer, viewerId),
      isPayee: false,
      share: debt.amount,
      splitLabel: splitValueLabel(expense.splitType, debt.splitValue),
    }))
  return [payee, ...others]
}

function splitValueLabel(splitType: SplitType, splitValue: string | null): string | null {
  if (splitValue === null) {
    return null
  }
  const value = trimDecimal(splitValue)
  if (splitType === 'percentage') {
    return `${value}%`
  }
  if (splitType === 'shares') {
    return value === '1' ? '1 share' : `${value} shares`
  }
  return null
}

/** Everyone in the expense but the viewer, for the delete warning. */
export function otherParticipantNames(expense: ExpenseResponse, viewerId: number): string[] {
  return peopleOtherThan(viewerId, [expense.payee, ...expense.debts.map((debt) => debt.payer)]).map(
    (person) => person.displayName,
  )
}

export function deleteWarning(otherNames: string[]): string {
  if (otherNames.length === 0) {
    return 'This can’t be undone.'
  }
  return `It disappears for ${joinNames(otherNames)} too, and balances change. This can’t be undone.`
}
