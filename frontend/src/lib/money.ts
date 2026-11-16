import type { CurrencyAmount } from '@/api/types'
import { formattingLocale } from '@/i18n/i18n'
import { fromScaled, toScaled } from './decimal'

const currencyFormats = new Map<string, Intl.NumberFormat>()

function currencyFormat(currency: string): Intl.NumberFormat {
  const locale = formattingLocale()
  const key = `${locale}:${currency}`
  let format = currencyFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, { style: 'currency', currency })
    currencyFormats.set(key, format)
  }
  return format
}

const amountFormats = new Map<string, Intl.NumberFormat>()

function amountFormat(): Intl.NumberFormat {
  const locale = formattingLocale()
  let format = amountFormats.get(locale)
  if (!format) {
    format = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    amountFormats.set(locale, format)
  }
  return format
}

// Intl formats a decimal string exactly, without going through a float.
function unsignedDecimal(amount: string): Intl.StringNumericLiteral {
  return amount.replace(/^-/, '') as Intl.StringNumericLiteral
}

/** Signless, in the active locale's format: "12,00 zł" in Polish, "PLN 12.00" in English. */
export function formatMoney(amount: string, currency: string): string {
  return currencyFormat(currency).format(unsignedDecimal(amount))
}

export function formatPln(amount: string): string {
  return formatMoney(amount, 'PLN')
}

/** "12,50–1500,00 zł" in Polish; signless. */
export function formatPlnRange(min: string, max: string): string {
  return currencyFormat('PLN').formatRange(unsignedDecimal(min), unsignedDecimal(max))
}

/** Grouped, 2 decimals, no sign and no currency. */
export function formatAmountNumber(amount: string): string {
  return amountFormat().format(unsignedDecimal(amount))
}

/** True for '0', '0.00', '-0.00' and the like. */
export function isZeroAmount(amount: string): boolean {
  return /^-?0*(\.0*)?$/.test(amount)
}

export function isNegativeAmount(amount: string): boolean {
  return amount.startsWith('-')
}

/** Which way a signed balance leans for the viewer: `owed` = others owe the viewer. */
export type BalanceDirection = 'owed' | 'owe' | 'none'

export function balanceDirection(amount: string): BalanceDirection {
  if (isZeroAmount(amount)) {
    return 'none'
  }
  return isNegativeAmount(amount) ? 'owe' : 'owed'
}

/** Green when others owe the viewer, red when the viewer owes. */
export const balanceTextClassName: Record<BalanceDirection, string> = {
  owed: 'text-positive',
  owe: 'text-negative',
  none: 'text-muted-foreground',
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

const allowedInput = new RegExp(`^\\d{0,${MAX_AMOUNT_INTEGER_DIGITS}}(?:[.,]\\d{0,2})?$`)

/** Keeps the field to something that can become an amount: digits, one separator, 2 decimals. */
export function sanitizeAmountInput(next: string, previous: string): string {
  const compact = next.replace(/\s/g, '')
  return allowedInput.test(compact) ? compact : previous
}

/** Adds 2-decimal money strings exactly (no float math): ['61.43', '61.43'] → '122.86'. */
export function sumAmounts(amounts: string[]): string {
  return fromGrosze(amounts.reduce((sum, amount) => sum + toGrosze(amount), 0n))
}
