import { afterEach, describe, expect, it } from 'vitest'
import { activateLocale } from '@/i18n/i18n'
import {
  balanceDirection,
  currencyAffix,
  findPlnAmount,
  formatGrosze,
  formatMoney,
  formatAmountNumber,
  formatDecimal,
  formatPln,
  formatPlnRange,
  isNegativeAmount,
  localizeAmountInput,
  parseAmountInput,
  sanitizeAmountInput,
  sumAmounts,
} from './money'

afterEach(async () => {
  await activateLocale('en')
})

describe('formatPln', () => {
  it.each([
    ['12.00', 'zł\u00a012.00'],
    ['-120.00', 'zł\u00a0120.00'],
    ['2552.03', 'zł\u00a02,552.03'],
    ['1000000.5', 'zł\u00a01,000,000.50'],
    ['7', 'zł\u00a07.00'],
  ])('formats %s as %s in English', (amount, expected) => {
    expect(formatPln(amount)).toBe(expected)
  })

  it.each([
    ['12.00', '12,00\u00a0zł'],
    ['-120.00', '120,00\u00a0zł'],
    ['2552.03', '2552,03\u00a0zł'],
    ['123456.78', '123\u00a0456,78\u00a0zł'],
    ['99999999.99', '99\u00a0999\u00a0999,99\u00a0zł'],
  ])('formats %s as %s in Polish', async (amount, expected) => {
    await activateLocale('pl')
    expect(formatPln(amount)).toBe(expected)
  })
})

describe('formatPlnRange and formatAmountNumber', () => {
  it('format in the active locale without a sign', async () => {
    expect(formatPlnRange('12.5', '-1500')).toBe('zł\u00a012.50–1,500.00')
    expect(formatAmountNumber('-1234.5')).toBe('1,234.50')
    await activateLocale('pl')
    expect(formatPlnRange('12.5', '1500')).toBe('12,50–1500,00\u00a0zł')
    expect(formatAmountNumber('12345.6')).toBe('12\u00a0345,60')
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

describe('formatMoney', () => {
  it('uses the locale’s currency format', async () => {
    expect(formatMoney('-1234.5', 'PLN')).toBe('zł\u00a01,234.50')
    expect(formatMoney('50', 'EUR')).toBe('€50.00')
    await activateLocale('pl')
    expect(formatMoney('50', 'EUR')).toBe('50,00\u00a0€')
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

describe('sumAmounts', () => {
  it.each([
    [['61.43', '61.43'], '122.86'],
    [['0.1', '0.2'], '0.30'],
    [['186.20'], '186.20'],
    [[], '0.00'],
    [['-5.00', '1.25'], '-3.75'],
  ])('adds %j to %s', (amounts, expected) => {
    expect(sumAmounts(amounts)).toBe(expected)
  })
})

describe('balanceDirection', () => {
  it.each([
    ['12.50', 'owed'],
    ['-0.01', 'owe'],
    ['0.00', 'none'],
    ['-0.00', 'none'],
    ['0', 'none'],
  ])('reads %s as %s', (value, expected) => {
    expect(balanceDirection(value)).toBe(expected)
  })
})

describe('localizeAmountInput', () => {
  it('shows the locale’s decimal separator', async () => {
    expect(localizeAmountInput('12,5')).toBe('12.5')
    await activateLocale('pl')
    expect(localizeAmountInput('12.50')).toBe('12,50')
    expect(localizeAmountInput('12')).toBe('12')
  })
})

describe('sanitizeAmountInput', () => {
  it('stores a typed decimal comma as a point', () => {
    expect(sanitizeAmountInput('12,50', '12,5')).toBe('12.50')
    expect(sanitizeAmountInput('1 234,5', '')).toBe('1234.5')
  })

  it('keeps the previous value when the input isn’t an amount', () => {
    expect(sanitizeAmountInput('12.505', '12.50')).toBe('12.50')
  })
})

describe('currencyAffix', () => {
  it('puts zł before the amount in English and after it in Polish', async () => {
    expect(currencyAffix('PLN')).toEqual({ symbol: 'zł', position: 'before' })
    await activateLocale('pl')
    expect(currencyAffix('PLN')).toEqual({ symbol: 'zł', position: 'after' })
  })
})

describe('formatDecimal', () => {
  it('drops trailing zeros and uses the locale’s separator, ungrouped', async () => {
    expect(formatDecimal('33.33')).toBe('33.33')
    expect(formatDecimal('12.50')).toBe('12.5')
    expect(formatDecimal('1500.00')).toBe('1500')
    await activateLocale('pl')
    expect(formatDecimal('33.33')).toBe('33,33')
  })
})
