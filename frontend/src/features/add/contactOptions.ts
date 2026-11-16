import { ApiError } from '@/api/client'
import { t } from '@lingui/core/macro'
import type { ContactListItem } from '@/api/types'
import { findPlnAmount, formatPln, isNegativeAmount } from '@/lib/money'

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')
}

/** Most recently active first, as the picker lists them before the user types. */
export function recentContacts(contacts: ContactListItem[], limit: number): ContactListItem[] {
  return [...contacts]
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, limit)
}

/** Matches the start of any word of the shown name, the real name, or the email. */
export function searchContacts(contacts: ContactListItem[], query: string): ContactListItem[] {
  const needle = normalize(query.trim())
  if (needle === '') {
    return contacts
  }

  return contacts.filter((contact) => {
    const names = [contact.person.displayName, contact.name ?? '']
      .map(normalize)
      .flatMap((name) => name.split(/\s+/))
    return (
      names.some((word) => word.startsWith(needle)) ||
      normalize(contact.person.displayName).startsWith(needle) ||
      normalize(contact.person.email).startsWith(needle)
    )
  })
}

export function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())
}

/** "Owes you PLN 192.92", "You owe PLN 120.00", "Settled up". */
export function balanceLine(contact: ContactListItem): string {
  const balance = findPlnAmount(contact.balances)
  if (balance === null) {
    return contact.isRegistered ? t`Settled up` : t`Not on Settle yet`
  }

  const amount = formatPln(balance)
  return isNegativeAmount(balance) ? t`You owe ${amount}` : t`Owes you ${amount}`
}

/** Why adding a contact by email failed, for the toast or inline error. */
export function addContactErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    const violation = error.violations[0]
    if (violation) {
      return violation.title
    }
    // A 400 without violations is the API refusing your own email.
    if (error.status === 400) {
      return t`You can’t add yourself as a contact.`
    }
  }
  return t`Couldn’t add this contact. Try again.`
}
