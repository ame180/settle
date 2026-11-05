import type { CurrencyAmount } from '@/api/types'
import { fromScaled, toScaled } from './decimal'

const NO_BREAK_SPACE = ' '

export function formatPln(amount: string): string {
  const [integerPart, fractionPart = ''] = amount.replace(/^-/, '').split('.')
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, NO_BREAK_SPACE)

  return `${groupedIntegerPart}.${fractionPart.padEnd(2, '0')}${NO_BREAK_SPACE}zł`
}

export function isNegativeAmount(amount: string): boolean {
  return amount.startsWith('-')
}

/** The API omits zero balances, so a missing PLN entry means nothing is owed in PLN. */
export function findPlnAmount(amounts: CurrencyAmount[]): string | null {
  return amounts.find((currencyAmount) => currencyAmount.currency === 'PLN')?.amount ?? null
}

/** Integer digits the API's Decimal(precision: 10, scale: 2) allows before the point. */
export const MAX_AMOUNT_INTEGER_DIGITS = 8

/**
 * Reads what the user typed into an amount field: decimal comma or point, spaces as thousands
 * separators. Returns a canonical "1234.50" string, or null when it isn't an amount with at most
 * two decimals.
 */
export function parseAmountInput(input: string): string | null {
  const compact = input.replace(/\s/g, '').replace(',', '.')
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(compact) ?? /^()\.(\d{1,2})$/.exec(compact)
  if (!match) {
    return null
  }

  const integerPart = match[1].replace(/^0+(?=\d)/, '') || '0'
  const fractionPart = (match[2] ?? '').padEnd(2, '0')

  return `${integerPart}.${fractionPart}`
}

export function toGrosze(amount: string): bigint {
  return toScaled(amount, 2)
}

export function fromGrosze(grosze: bigint): string {
  return fromScaled(grosze, 2)
}

export function formatGrosze(grosze: bigint): string {
  return formatPln(fromGrosze(grosze))
}
