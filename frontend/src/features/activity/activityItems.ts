import type { ActivityItem } from '@/api/types'
import { calendarDayKey } from '@/lib/dates'

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

export type BalanceDirection = 'owed' | 'owe' | 'none'

/** How an item moved the viewer's balance: `owed` = others owe the viewer more. */
export function balanceDirection(value: string): BalanceDirection {
  if (/^-?0*(\.0*)?$/.test(value)) {
    return 'none'
  }
  return value.startsWith('-') ? 'owe' : 'owed'
}

export const balanceDirectionLabel: Record<BalanceDirection, string> = {
  owed: 'you lent',
  owe: 'you borrowed',
  none: 'no balance',
}

/** Who did what in a transfer, from the viewer's side: "You" + "paid Anna", "Anna" + "paid you". */
export function describeTransfer(
  item: ActivityItem,
  viewerId: number,
): { actor: string; verb: string } {
  const payer = item.payer ?? item.payee
  const actor = payer.id === viewerId ? 'You' : payer.displayName
  const target = item.payee.id === viewerId ? 'you' : item.payee.displayName
  return { actor, verb: `paid ${target}` }
}
