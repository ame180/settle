import { describe, expect, it } from 'vitest'
import { formatCommentTime } from './commentTime'

const now = new Date(2026, 10, 5, 12, 0)

function localIso(year: number, monthIndex: number, day: number, hour: number, minute: number) {
  return new Date(year, monthIndex, day, hour, minute).toISOString()
}

describe('formatCommentTime', () => {
  it('names today and yesterday', () => {
    expect(formatCommentTime(localIso(2026, 10, 5, 9, 7), now)).toBe('Today, 09:07')
    expect(formatCommentTime(localIso(2026, 10, 4, 23, 59), now)).toBe('Yesterday, 23:59')
  })

  it('falls back to the date, with the year outside the current one', () => {
    expect(formatCommentTime(localIso(2026, 9, 20, 18, 30), now)).toBe('20 Oct, 18:30')
    expect(formatCommentTime(localIso(2025, 11, 31, 8, 0), now)).toBe('31 Dec 2025, 08:00')
  })
})
