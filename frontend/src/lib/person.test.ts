import { describe, expect, it } from 'vitest'
import { getInitials } from './person'

describe('getInitials', () => {
  it.each([
    ['Anna Kowalska', 'AK'],
    ['Bartek', 'B'],
    ['  ewa  maria nowak ', 'EN'],
    ['łukasz Żak', 'ŁŻ'],
    ['jan.nowak@example.com', 'J'],
    ['', '?'],
  ])('derives %j -> %s', (displayName, expected) => {
    expect(getInitials(displayName)).toBe(expected)
  })
})
