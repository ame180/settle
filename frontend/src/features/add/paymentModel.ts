import { t } from '@lingui/core/macro'
import { formatGrosze } from '@/lib/money'

export type PaymentPayer = 'me' | 'them'

/** How a payment moves the balance with that person (positive = they owe the user). */
export function paymentEffect(payer: PaymentPayer, grosze: bigint): bigint {
  // The user paying them lends more (or repays); them paying the user does the opposite.
  return payer === 'me' ? grosze : -grosze
}

export type PaymentOutcome = {
  tone: 'settles' | 'reduces' | 'warns'
  title: string
  detail: string
}

/** "Anna owes you zł 192.92 now." – where the two stand before the payment. */
export function describeBalance(balance: bigint, name: string): string {
  return owesSentence(balance, name, 'now')
}

function owesSentence(balance: bigint, name: string, tense: 'now' | 'will'): string {
  if (balance === 0n) {
    return tense === 'now'
      ? t`You and ${name} are settled up now.`
      : t`You and ${name} will be settled up`
  }
  const amount = formatGrosze(balance)
  if (balance > 0n) {
    return tense === 'now' ? t`${name} owes you ${amount} now.` : t`${name} will owe you ${amount}`
  }
  return tense === 'now' ? t`You owe ${name} ${amount} now.` : t`You’ll owe ${name} ${amount}`
}

/**
 * The live line under a payment's amount: what the balance becomes, and a warning when the
 * payment grows the debt (or flips it) instead of clearing it.
 */
export function describePayment(balance: bigint, after: bigint, name: string): PaymentOutcome {
  const now = owesSentence(balance, name, 'now')
  if (after === 0n) {
    return { tone: 'settles', title: owesSentence(0n, name, 'will'), detail: now }
  }

  const sameSide = (balance > 0n && after > 0n) || (balance < 0n && after < 0n)
  const magnitude = (value: bigint) => (value < 0n ? -value : value)
  if (sameSide && magnitude(after) < magnitude(balance)) {
    const remaining = formatGrosze(after)
    const title =
      after > 0n
        ? t`${name} will still owe you ${remaining}`
        : t`You’ll still owe ${name} ${remaining}`
    return { tone: 'reduces', title, detail: now }
  }

  const title = owesSentence(after, name, 'will')
  if (balance === 0n) {
    return { tone: 'warns', title, detail: now }
  }
  const current = formatGrosze(balance)
  if (sameSide) {
    return {
      tone: 'warns',
      title,
      detail:
        balance > 0n
          ? t`This adds to what ${name} already owes you (${current}).`
          : t`This adds to what you already owe ${name} (${current}).`,
    }
  }
  return {
    tone: 'warns',
    title,
    detail:
      balance > 0n
        ? t`That’s more than ${name} owes you (${current}).`
        : t`That’s more than you owe ${name} (${current}).`,
  }
}

/** Who pays to clear a balance: them when they owe the user, the user otherwise. */
export function clearingPayer(balance: bigint): PaymentPayer {
  return balance > 0n ? 'them' : 'me'
}
