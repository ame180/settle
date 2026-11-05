import { describe, expect, it } from 'vitest'
import { addDays, formatDateLabel, toIsoDate } from './dates'

describe('dates', () => {
  it('formats local calendar dates', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it.each([
    ['2026-11-05', 'Today'],
    ['2026-11-04', 'Yesterday'],
    ['2026-10-20', '20 Oct'],
    ['2025-12-31', '31 Dec 2025'],
  ])('labels %s as %s', (isoDate, expected) => {
    expect(formatDateLabel(isoDate, '2026-11-05')).toBe(expected)
  })
})
