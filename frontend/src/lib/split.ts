import type { SplitType } from '@/api/types'
import { fromScaled, toScaled } from './decimal'

// Port of src/Services/SplitCalculator.php. The server's split is authoritative, so this keeps
// its bcmath semantics exactly: values truncate (never round) to the scale bcmath is given,
// weights are summed at scale 6, and leftover cents go to the largest truncated remainders,
// ties keeping input order (PHP's usort is stable).

export type SplitDebtInput = {
  payerId: number
  value?: string | null
}

export type SplitResult = {
  payerId: number
  amount: string
  splitValue: string | null
}

export class SplitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SplitError'
  }
}

const WEIGHT_SCALE = 6

export function calculateSplit(
  splitType: SplitType,
  total: string,
  debts: SplitDebtInput[],
): SplitResult[] {
  switch (splitType) {
    case 'exact':
      return exact(total, debts)
    case 'percentage':
      return percentage(total, debts)
    case 'shares':
      return assign(total, debts, debts.map(requireValue), true)
    case 'equal':
      return assign(
        total,
        debts,
        debts.map(() => '1'),
        false,
      )
  }
}

function exact(total: string, debts: SplitDebtInput[]): SplitResult[] {
  let sum = 0n
  const result = debts.map((debt) => {
    const value = toScaled(requireValue(debt), 2)
    sum += value
    return { payerId: debt.payerId, amount: fromScaled(value, 2), splitValue: null }
  })

  if (sum !== toScaled(total, 2)) {
    throw new SplitError('Debts amount sum must be equal to expense amount.')
  }

  return result
}

function percentage(total: string, debts: SplitDebtInput[]): SplitResult[] {
  const weights = debts.map(requireValue)
  const percentTotal = weights.reduce((sum, weight) => sum + toScaled(weight, 2), 0n)

  if (percentTotal !== 10000n) {
    throw new SplitError('Split percentages must total 100.')
  }

  return assign(total, debts, weights, true)
}

function assign(
  total: string,
  debts: SplitDebtInput[],
  weights: string[],
  storeWeight: boolean,
): SplitResult[] {
  const scaledWeights = weights.map((weight) => toScaled(weight, WEIGHT_SCALE))
  const weightTotal = scaledWeights.reduce((sum, weight) => sum + weight, 0n)

  if (weightTotal === 0n) {
    throw new SplitError('Split weights must be greater than zero.')
  }

  const totalCents = toScaled(total, 2)
  const unit = 10n ** BigInt(WEIGHT_SCALE)

  // ideal = totalCents * weight / weightTotal, truncated to 6 decimals, kept as an integer
  // count of millionths of a cent.
  const ideals = scaledWeights.map((weight) => (totalCents * weight * unit) / weightTotal)
  const floors = ideals.map((ideal) => ideal / unit)
  const remainders = ideals.map((ideal) => ideal % unit)

  let leftover = totalCents - floors.reduce((sum, floor) => sum + floor, 0n)
  const order = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => (a.remainder === b.remainder ? 0 : a.remainder > b.remainder ? -1 : 1))
  for (const { index } of order) {
    if (leftover <= 0n) {
      break
    }
    floors[index] += 1n
    leftover -= 1n
  }

  return debts.map((debt, index) => ({
    payerId: debt.payerId,
    amount: fromScaled(floors[index], 2),
    splitValue: storeWeight ? fromScaled(toScaled(weights[index], 2), 2) : null,
  }))
}

function requireValue(debt: SplitDebtInput): string {
  if (debt.value === null || debt.value === undefined) {
    throw new SplitError('A split value is required for each debtor.')
  }

  return debt.value
}
