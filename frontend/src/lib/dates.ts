// API dates are calendar days. The API takes "YYYY-MM-DD" and sends midnight UTC
// (`2026-10-22T00:00:00+00:00`); reading only the date part keeps them on the same day in every
// time zone. Days are handled as local-time `Date`s at midnight.

import { t } from '@lingui/core/macro'
import { formattingLocale } from '@/i18n/i18n'

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

const dateFormats = new Map<string, Intl.DateTimeFormat>()

function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = formattingLocale()
  const key = `${locale}:${JSON.stringify(options)}`
  let format = dateFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    dateFormats.set(key, format)
  }
  return format
}

function formatDate(isoDate: string, today: string, withWeekday: boolean): string {
  const day = fromIsoDate(isoDate)
  const otherYear = day.getFullYear() !== fromIsoDate(today).getFullYear()
  return dateFormat({
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: otherYear ? 'numeric' : undefined,
  }).format(day)
}

function relativeDayLabel(isoDate: string, today: string): string | null {
  const day = calendarDayKey(isoDate)
  if (day === today) {
    return t`Today`
  }
  if (day === addDays(today, -1)) {
    return t`Yesterday`
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
export function formatDateLabel(isoDate: string, now: Date = new Date()): string {
  const today = todayIso(now)
  return relativeDayLabel(isoDate, today) ?? formatDate(isoDate, today, false)
}

/** "12 November"; "12 listopada" in Polish. */
export function formatLongDate(isoDate: string): string {
  return dateFormat({ day: 'numeric', month: 'long' }).format(fromIsoDate(isoDate))
}

/** "November 2026"; "listopad 2026" in Polish. */
export function formatMonthYear(date: Date): string {
  return dateFormat({ month: 'long', year: 'numeric' }).format(date)
}

/** Monday-first weekday names for a calendar header: "Monday" / "M", "poniedziałek" / "P". */
export function calendarWeekdays(): { long: string; narrow: string }[] {
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2024, 0, 1 + index)
    return {
      long: dateFormat({ weekday: 'long' }).format(day),
      narrow: dateFormat({ weekday: 'narrow' }).format(day),
    }
  })
}
