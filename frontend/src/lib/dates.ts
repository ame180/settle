const DAY_MS = 24 * 60 * 60 * 1000

/**
 * API dates are calendar days sent as midnight UTC (`2026-10-22T00:00:00+00:00`). Reading only
 * the date part keeps them on the same day in every time zone.
 */
function toCalendarDay(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function localCalendarDay(now: Date): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function formatDate(day: Date, today: Date, withWeekday: boolean): string {
  const parts = [`${day.getUTCDate()} ${monthFormat.format(day)}`]
  if (withWeekday) {
    parts.unshift(`${weekdayFormat.format(day)},`)
  }
  if (day.getUTCFullYear() !== today.getUTCFullYear()) {
    parts.push(String(day.getUTCFullYear()))
  }
  return parts.join(' ')
}

/** The `YYYY-MM-DD` part of an API date, for grouping by day. */
export function calendarDayKey(isoDate: string): string {
  return isoDate.slice(0, 10)
}

/** Day header label: "Today", "Yesterday", "Thu, 22 Oct", or "Wed, 31 Dec 2025" in other years. */
export function formatDayLabel(isoDate: string, now: Date = new Date()): string {
  const day = toCalendarDay(isoDate)
  const today = localCalendarDay(now)
  const daysAgo = Math.round((today.getTime() - day.getTime()) / DAY_MS)
  if (daysAgo === 0) {
    return 'Today'
  }
  if (daysAgo === 1) {
    return 'Yesterday'
  }
  return formatDate(day, today, true)
}

/** Short date for row sublines: "22 Oct", or "31 Dec 2025" in other years. */
export function formatShortDate(isoDate: string, now: Date = new Date()): string {
  return formatDate(toCalendarDay(isoDate), localCalendarDay(now), false)
}
