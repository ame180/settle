import { t } from '@lingui/core/macro'
import type { ActivityItem, PersonRef } from '@/api/types'
import { calendarDayKey } from '@/lib/dates'
import type { BalanceDirection } from '@/lib/money'

export type ActivityDay = {
  /** `YYYY-MM-DD` */
  day: string
  items: ActivityItem[]
}

/** Groups a newest-first feed into consecutive days, keeping the API's order inside each day. */
export function groupActivityByDay(items: ActivityItem[]): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const item of items) {
    const day = calendarDayKey(item.occurredOn)
    const lastDay = days[days.length - 1]
    if (lastDay?.day === day) {
      lastDay.items.push(item)
      continue
    }
    days.push({ day, items: [item] })
  }
  return days
}

/**
 * Flattens offset pages. A row added while paging shifts later pages by one, so the same item
 * can come back twice; the first copy wins.
 */
export function flattenActivityPages(pages: ActivityItem[][]): ActivityItem[] {
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const item of pages.flat()) {
    const key = activityItemKey(item)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    items.push(item)
  }
  return items
}

export function activityItemKey(item: ActivityItem): string {
  return `${item.type}-${item.id}`
}

export function activityItemPath(item: ActivityItem): string {
  return item.type === 'expense' ? `/expenses/${item.id}` : `/transfers/${item.id}`
}

export function balanceDirectionLabel(direction: BalanceDirection): string {
  switch (direction) {
    case 'owed':
      return t`you lent`
    case 'owe':
      return t`you borrowed`
    case 'none':
      return t`no balance`
  }
}

/** Which side of a transfer the viewer is on, so each reading gets its own translated sentence. */
export type TransferSide = 'viewer-paid' | 'viewer-received' | 'others'

export function transferSide(
  payer: Pick<PersonRef, 'id'>,
  payee: Pick<PersonRef, 'id'>,
  viewerId: number,
): TransferSide {
  if (payer.id === viewerId) {
    return 'viewer-paid'
  }
  return payee.id === viewerId ? 'viewer-received' : 'others'
}
