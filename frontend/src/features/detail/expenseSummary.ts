import { plural, t } from '@lingui/core/macro'
import type { ExpenseResponse, PersonRef, SplitType } from '@/api/types'
import { isZeroAmount, sumAmounts, type BalanceDirection } from '@/lib/money'
import { trimDecimal } from '@/lib/decimal'
import { joinNames, nameForViewer, peopleOtherThan } from '@/lib/person'

export type ExpensePosition = {
  direction: BalanceDirection
  amount: string
}

/** What the expense does to the viewer's balance, from the server's split. */
export function expensePosition(expense: ExpenseResponse, viewerId: number): ExpensePosition {
  if (expense.payee.id === viewerId) {
    const othersOwe = sumAmounts(
      expense.debts.filter((debt) => debt.payer.id !== viewerId).map((debt) => debt.amount),
    )
    return isZeroAmount(othersOwe)
      ? { direction: 'none', amount: othersOwe }
      : { direction: 'owed', amount: othersOwe }
  }

  const ownShare = expense.debts.find((debt) => debt.payer.id === viewerId)?.amount ?? '0.00'
  return isZeroAmount(ownShare)
    ? { direction: 'none', amount: ownShare }
    : { direction: 'owe', amount: ownShare }
}

export function splitHeading(expense: ExpenseResponse): string {
  switch (expense.splitType) {
    case 'equal': {
      const count = expense.debts.length
      return plural(count, {
        one: 'Split equally between #',
        other: 'Split equally between #',
      })
    }
    case 'exact':
      return t`Split by amounts`
    case 'percentage':
      return t`Split by percentages`
    case 'shares':
      return t`Split by shares`
  }
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
    const shareCount = Number(value)
    return plural(shareCount, { one: '# share', other: '# shares' })
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
    return t`This can’t be undone.`
  }
  const names = joinNames(otherNames)
  return t`It disappears for ${names} too, and balances change. This can’t be undone.`
}
