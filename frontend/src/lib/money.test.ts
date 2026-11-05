import { describe, expect, it } from 'vitest'
import { findPlnAmount, formatGrosze, formatPln, isNegativeAmount, parseAmountInput } from './money'

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

describe('parseAmountInput', () => {
  it.each([
    ['99', '99.00'],
    ['99,5', '99.50'],
    ['99.05', '99.05'],
    ['1 535,64', '1535.64'],
    ['007', '7.00'],
    [',5', '0.50'],
    ['12.', '12.00'],
  ])('reads %j as %s', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected)
  })

  it.each(['', 'abc', '1.234', '1,2,3', '-5', '.'])('rejects %j', (input) => {
    expect(parseAmountInput(input)).toBeNull()
  })
})

describe('formatGrosze', () => {
  it('formats integer grosze, signless', () => {
    expect(formatGrosze(4950n)).toBe(formatPln('49.50'))
    expect(formatGrosze(-153564n)).toBe(formatPln('1535.64'))
  })
})
