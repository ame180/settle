import { describe, expect, it } from 'vitest'
import { getInitials, getShortName, joinNames, peopleOtherThan } from './person'

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

describe('joinNames', () => {
  it.each([
    [[], ''],
    [['Anna'], 'Anna'],
    [['Anna', 'Ewa'], 'Anna and Ewa'],
    [['Anna', 'Ewa', 'Tomasz'], 'Anna, Ewa and Tomasz'],
  ])('joins %j as %j', (names, expected) => {
    expect(joinNames(names)).toBe(expected)
  })
})

describe('peopleOtherThan', () => {
  it('drops the viewer and repeats, keeping first-seen order', () => {
    const people = [{ id: 2 }, { id: 1 }, { id: 3 }, { id: 2 }]
    expect(peopleOtherThan(1, people)).toEqual([{ id: 2 }, { id: 3 }])
  })
})
