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

function owesSentence(balance: bigint, name: string, tense: 'now' | 'will'): string {
  if (balance === 0n) {
    return tense === 'now'
      ? `You and ${name} are settled up now.`
      : `You and ${name} will be settled up`
  }
  const amount = formatGrosze(balance)
  if (balance > 0n) {
    return tense === 'now' ? `${name} owes you ${amount} now.` : `${name} will owe you ${amount}`
  }
  return tense === 'now' ? `You owe ${name} ${amount} now.` : `You’ll owe ${name} ${amount}`
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
    const title =
      after > 0n
        ? `${name} will still owe you ${formatGrosze(after)}`
        : `You’ll still owe ${name} ${formatGrosze(after)}`
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
          ? `This adds to what ${name} already owes you (${current}).`
          : `This adds to what you already owe ${name} (${current}).`,
    }
  }
  return {
    tone: 'warns',
    title,
    detail:
      balance > 0n
        ? `That’s more than ${name} owes you (${current}).`
        : `That’s more than you owe ${name} (${current}).`,
  }
}

/** Who pays to clear a balance: them when they owe the user, the user otherwise. */
export function clearingPayer(balance: bigint): PaymentPayer {
  return balance > 0n ? 'them' : 'me'
}
