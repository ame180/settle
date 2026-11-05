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

/** "Owes you 192.92 zł", "You owe 120.00 zł", "Settled up". */
export function balanceLine(contact: ContactListItem): string {
  const balance = findPlnAmount(contact.balances)
  if (balance === null) {
    return contact.isRegistered ? 'Settled up' : 'Not on Settle yet'
  }

  return isNegativeAmount(balance)
    ? `You owe ${formatPln(balance)}`
    : `Owes you ${formatPln(balance)}`
}
