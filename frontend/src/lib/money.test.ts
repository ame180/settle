import { describe, expect, it } from 'vitest'
import { findPlnAmount, formatPln, isNegativeAmount } from './money'

describe('formatPln', () => {
  it.each([
    ['12.00', '12.00 zł'],
    ['-120.00', '120.00 zł'],
    ['2552.03', '2 552.03 zł'],
    ['123456.78', '123 456.78 zł'],
    ['1000000.5', '1 000 000.50 zł'],
    ['7', '7.00 zł'],
  ])('formats %s as %s', (amount, expected) => {
    expect(formatPln(amount)).toBe(expected)
  })
})

describe('isNegativeAmount', () => {
  it('detects the sign of a decimal string', () => {
    expect(isNegativeAmount('-0.01')).toBe(true)
    expect(isNegativeAmount('0.01')).toBe(false)
  })
})

describe('findPlnAmount', () => {
  it('returns the PLN amount or null when there is none', () => {
    expect(
      findPlnAmount([
        { currency: 'EUR', amount: '5.00' },
        { currency: 'PLN', amount: '-12.50' },
      ]),
    ).toBe('-12.50')
    expect(findPlnAmount([{ currency: 'EUR', amount: '5.00' }])).toBeNull()
  })
})
