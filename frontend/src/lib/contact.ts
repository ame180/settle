import { ApiError } from '@/api/client'
import { t } from '@lingui/core/macro'
import type { ContactListItem } from '@/api/types'
import { isNegativeAmount } from './money'

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

/** The API rejects your own email with a bare 400, without violations. */
export function isOwnEmailRejection(error: Error): error is ApiError {
  return error instanceof ApiError && error.status === 400 && error.violations.length === 0
}

/** Why adding a contact by email failed, for the toast or inline error. */
export function addContactErrorMessage(error: Error): string {
  if (isOwnEmailRejection(error)) {
    return t`You can’t add yourself as a contact.`
  }
  if (error instanceof ApiError && error.violations[0]) {
    return error.violations[0].title
  }
  return t`Couldn’t add this contact. Try again.`
}
