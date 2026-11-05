// API dates are calendar days. The API takes "YYYY-MM-DD" and sends midnight UTC
// (`2026-10-22T00:00:00+00:00`); reading only the date part keeps them on the same day in every
// time zone. Days are handled as local-time `Date`s at midnight.

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now)
}

export function addDays(isoDate: string, days: number): string {
  const date = fromIsoDate(isoDate)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** The `YYYY-MM-DD` part of an API date, for grouping by day. */
export function calendarDayKey(isoDate: string): string {
  return isoDate.slice(0, 10)
}

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' })

function formatDate(isoDate: string, today: string, withWeekday: boolean): string {
  const day = fromIsoDate(isoDate)
  const parts = [`${day.getDate()} ${monthFormat.format(day)}`]
  if (withWeekday) {
    parts.unshift(`${weekdayFormat.format(day)},`)
  }
  if (day.getFullYear() !== fromIsoDate(today).getFullYear()) {
    parts.push(String(day.getFullYear()))
  }
  return parts.join(' ')
}

function relativeDayLabel(isoDate: string, today: string): string | null {
  const day = calendarDayKey(isoDate)
  if (day === today) {
    return 'Today'
  }
  if (day === addDays(today, -1)) {
    return 'Yesterday'
  }
  return null
}

/** Day header label: "Today", "Yesterday", "Thu, 22 Oct", or "Wed, 31 Dec 2025" in other years. */
export function formatDayLabel(isoDate: string, now: Date = new Date()): string {
  const today = todayIso(now)
  return relativeDayLabel(isoDate, today) ?? formatDate(isoDate, today, true)
}

/** Short date for row sublines: "22 Oct", or "31 Dec 2025" in other years. */
export function formatShortDate(isoDate: string, now: Date = new Date()): string {
  return formatDate(isoDate, todayIso(now), false)
}

/** "Today", "Yesterday", "20 Oct", or "20 Oct 2025" outside the current year. */
export function formatDateLabel(isoDate: string, today = todayIso()): string {
  return relativeDayLabel(isoDate, today) ?? formatDate(isoDate, today, false)
}

/** "12 November". */
export function formatLongDate(isoDate: string): string {
  return fromIsoDate(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}
