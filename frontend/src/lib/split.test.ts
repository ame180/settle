import { describe, expect, it } from 'vitest'
import type { SplitType } from '@/api/types'
import { fromScaled, toScaled } from './decimal'
import { calculateSplit, SplitError, type SplitResult } from './split'

// Copied 1:1 from tests/Unit/Services/SplitCalculatorTest.php so the preview can't drift from
// the server. Keep the two in step.

function sum(result: SplitResult[]): string {
  return fromScaled(
    result.reduce((total, debt) => total + toScaled(debt.amount, 2), 0n),
    2,
  )
}

describe('calculateSplit (mirrors SplitCalculatorTest)', () => {
  it('exact passes through and stores no split value', () => {
    const result = calculateSplit('exact', '100.00', [
      { payerId: 1, value: '70.00' },
      { payerId: 2, value: '30.00' },
    ])

    expect(result).toEqual([
      { payerId: 1, amount: '70.00', splitValue: null },
      { payerId: 2, amount: '30.00', splitValue: null },
    ])
  })

  it('exact fails when sum does not match', () => {
    expect(() =>
      calculateSplit('exact', '100.00', [
        { payerId: 1, value: '70.00' },
        { payerId: 2, value: '20.00' },
      ]),
    ).toThrow(SplitError)
  })

  it('percentage computes amounts and stores percent', () => {
    const result = calculateSplit('percentage', '100.00', [
      { payerId: 1, value: '30.00' },
      { payerId: 2, value: '70.00' },
    ])

    expect(result).toEqual([
      { payerId: 1, amount: '30.00', splitValue: '30.00' },
      { payerId: 2, amount: '70.00', splitValue: '70.00' },
    ])
  })

  it('percentage fails when not hundred', () => {
    expect(() =>
      calculateSplit('percentage', '100.00', [
        { payerId: 1, value: '30.00' },
        { payerId: 2, value: '60.00' },
      ]),
    ).toThrow(SplitError)
  })

  it('shares distributes remainder by largest fraction', () => {
    const result = calculateSplit('shares', '10.00', [
      { payerId: 1, value: '1' },
      { payerId: 2, value: '1' },
      { payerId: 3, value: '1' },
    ])

    // 10.00 / 3 = 3.3333; leftover cent goes to the first by stable tie-break.
    expect(result).toEqual([
      { payerId: 1, amount: '3.34', splitValue: '1.00' },
      { payerId: 2, amount: '3.33', splitValue: '1.00' },
      { payerId: 3, amount: '3.33', splitValue: '1.00' },
    ])

    expect(sum(result)).toBe('10.00')
  })

  it('shares proportional', () => {
    const result = calculateSplit('shares', '90.00', [
      { payerId: 1, value: '1' },
      { payerId: 2, value: '2' },
    ])

    expect(result).toEqual([
      { payerId: 1, amount: '30.00', splitValue: '1.00' },
      { payerId: 2, amount: '60.00', splitValue: '2.00' },
    ])
  })

  it('equal splits evenly without split value', () => {
    const result = calculateSplit('equal', '10.00', [
      { payerId: 1 },
      { payerId: 2 },
      { payerId: 3 },
    ])

    expect(result).toEqual([
      { payerId: 1, amount: '3.34', splitValue: null },
      { payerId: 2, amount: '3.33', splitValue: null },
      { payerId: 3, amount: '3.33', splitValue: null },
    ])

    expect(sum(result)).toBe('10.00')
  })

  it('percentage with rounding still sums to total', () => {
    const result = calculateSplit('percentage', '100.00', [
      { payerId: 1, value: '33.33' },
      { payerId: 2, value: '33.33' },
      { payerId: 3, value: '33.34' },
    ])

    expect(sum(result)).toBe('100.00')
  })

  it.each<[string, SplitType]>([
    ['exact', 'exact'],
    ['percentage', 'percentage'],
    ['shares', 'shares'],
  ])('value is required for non-equal types (%s)', (_name, splitType) => {
    expect(() => calculateSplit(splitType, '100.00', [{ payerId: 1 }])).toThrow(SplitError)
  })
})

describe('calculateSplit (port details)', () => {
  it('gives leftover cents to the largest remainders, not the first rows', () => {
    // 1.00 by shares 1/1/2: ideals 25 / 25 / 50, no leftover.
    expect(
      calculateSplit('shares', '1.00', [
        { payerId: 1, value: '1' },
        { payerId: 2, value: '1' },
        { payerId: 3, value: '2' },
      ]).map((debt) => debt.amount),
    ).toEqual(['0.25', '0.25', '0.50'])

    // 0.10 by 33/33/34 %: ideals 3.3 / 3.3 / 3.4 cents; the one leftover cent goes to the 3rd.
    expect(
      calculateSplit('percentage', '0.10', [
        { payerId: 1, value: '33' },
        { payerId: 2, value: '33' },
        { payerId: 3, value: '34' },
      ]).map((debt) => debt.amount),
    ).toEqual(['0.03', '0.03', '0.04'])
  })

  it('matches the server on uneven weights (checked against SplitCalculator.php)', () => {
    expect(
      calculateSplit('shares', '100.00', [
        { payerId: 1, value: '3' },
        { payerId: 2, value: '7' },
        { payerId: 3, value: '11' },
      ]).map((debt) => debt.amount),
    ).toEqual(['14.29', '33.33', '52.38'])

    expect(
      calculateSplit('equal', '0.05', [{ payerId: 1 }, { payerId: 2 }, { payerId: 3 }]).map(
        (debt) => debt.amount,
      ),
    ).toEqual(['0.02', '0.02', '0.01'])
  })

  it('handles amounts too large for float maths', () => {
    const result = calculateSplit('equal', '99999999.99', [{ payerId: 1 }, { payerId: 2 }])

    expect(result.map((debt) => debt.amount)).toEqual(['50000000.00', '49999999.99'])
  })

  it('rejects all-zero weights', () => {
    expect(() => calculateSplit('shares', '10.00', [{ payerId: 1, value: '0' }])).toThrow(
      SplitError,
    )
  })
})
