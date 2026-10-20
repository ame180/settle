import type { CurrencyAmount } from '@/api/types'

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
