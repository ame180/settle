import type { ContactListItem } from '@/api/types'
import { isNegativeAmount } from './money'

/** First word of the display name, for sentences like "Anna owes you". */
export function shortName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName
}

/** Their own name (when a nickname hides it) and email, without repeating the display name. */
export function contactSecondaryLine(contact: ContactListItem): string {
  const { person, name } = contact
  const parts: string[] = []
  if (name !== null && name !== person.displayName) {
    parts.push(name)
  }
  if (person.email !== person.displayName) {
    parts.push(person.email)
  }
  return parts.join(' · ')
}

/**
 * Add's Payment tab, prefilled to clear the balance: when they owe you they pay, when you owe
 * them you pay. `balance` is the signed PLN balance, positive when they owe you.
 */
export function settleUpPath(contactId: number, balance: string): string {
  const params = new URLSearchParams({
    tab: 'payment',
    contact: String(contactId),
    amount: balance.replace(/^-/, ''),
    payer: isNegativeAmount(balance) ? 'me' : 'them',
  })
  return `/add?${params}`
}

export function addExpenseWithPath(contactId: number): string {
  return `/add?contact=${contactId}`
}
