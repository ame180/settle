// Calendar dates as the API takes them: "YYYY-MM-DD" in the user's local time zone.

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

/** "Today", "Yesterday", "20 Oct", or "20 Oct 2025" outside the current year. */
export function formatDateLabel(isoDate: string, today = todayIso()): string {
  if (isoDate === today) {
    return 'Today'
  }
  if (isoDate === addDays(today, -1)) {
    return 'Yesterday'
  }

  const date = fromIsoDate(isoDate)
  const sameYear = date.getFullYear() === fromIsoDate(today).getFullYear()
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** "12 November". */
export function formatLongDate(isoDate: string): string {
  return fromIsoDate(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}
