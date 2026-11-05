import { describe, expect, it } from 'vitest'
import { addDays, formatDateLabel, formatDayLabel, formatShortDate, toIsoDate } from './dates'

// Local noon, so the test reads the same day in any time zone.
const now = new Date(2026, 10, 5, 12, 0)

describe('toIsoDate and addDays', () => {
  it('formats local calendar dates', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('formatDayLabel', () => {
  it.each([
    ['2026-11-05T00:00:00+00:00', 'Today'],
    ['2026-11-04T00:00:00+00:00', 'Yesterday'],
    ['2026-10-22T00:00:00+00:00', 'Thu, 22 Oct'],
    ['2025-12-31T00:00:00+00:00', 'Wed, 31 Dec 2025'],
  ])('labels %s as %s', (date, expected) => {
    expect(formatDayLabel(date, now)).toBe(expected)
  })
})

describe('formatShortDate', () => {
  it('adds the year only outside the current one', () => {
    expect(formatShortDate('2026-10-20T00:00:00+00:00', now)).toBe('20 Oct')
    expect(formatShortDate('2025-09-28T00:00:00+00:00', now)).toBe('28 Sep 2025')
  })
})

describe('formatDateLabel', () => {
  it.each([
    ['2026-11-05', 'Today'],
    ['2026-11-04', 'Yesterday'],
    ['2026-10-20', '20 Oct'],
    ['2025-12-31', '31 Dec 2025'],
  ])('labels %s as %s', (isoDate, expected) => {
    expect(formatDateLabel(isoDate, '2026-11-05')).toBe(expected)
  })
})
