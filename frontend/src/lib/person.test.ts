import { describe, expect, it } from 'vitest'
import { getInitials, getShortName } from './person'

describe('getInitials', () => {
  it.each([
    ['Anna Kowalska', 'AK'],
    ['Bartek', 'B'],
    ['  ewa  maria nowak ', 'EN'],
    ['łukasz Żak', 'ŁŻ'],
    ['jan.nowak@example.com', 'J'],
    ['Tomek (flatmate)', 'TF'],
    ['(Ola)', 'O'],
    ['Z\u0307ak', 'Ż'],
    ['Ania ❤️', 'A'],
    ['ś. Ździsław', 'ŚŹ'],
    ['123 !!', '?'],
    ['', '?'],
  ])('derives %j -> %s', (displayName, expected) => {
    expect(getInitials(displayName)).toBe(expected)
  })
})

describe('getShortName', () => {
  it.each([
    ['Anna Kowalska', 'Anna'],
    ['Kuba', 'Kuba'],
    ['jan.nowak@gmail.com', 'jan.nowak'],
    ['  Ewa  Nowak ', 'Ewa'],
  ])('shortens %j to %s', (displayName, expected) => {
    expect(getShortName(displayName)).toBe(expected)
  })
})
