import type { ContactListItem } from '@/api/types'

const SETTLED_HIDE_AFTER_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A contact leaves the main list only when nothing is owed in any currency (the API omits
 * zero balances) and nothing happened for a while, so new and freshly settled contacts stay.
 */
export function isHiddenAsSettled(contact: ContactListItem, now: Date): boolean {
  if (contact.balances.length > 0) {
    return false
  }

  const lastActivity = new Date(contact.lastActivityAt).getTime()

  return now.getTime() - lastActivity > SETTLED_HIDE_AFTER_DAYS * DAY_MS
}
