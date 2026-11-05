import { describe, expect, it } from 'vitest'
import { guessCategory } from './categoryGuess'

describe('guessCategory', () => {
  it.each([
    ['Pizza', 'food_and_drink'],
    ['Kolacja w Mama Mia', 'food_and_drink'],
    ['Zakupy Biedronka', 'groceries'],
    ['zakupów w Lidlu', 'groceries'],
    ['Uber z lotniska', 'transport'],
    ['Paliwo', 'transport'],
    ['Czynsz listopad', 'home_and_bills'],
    ['Prąd', 'home_and_bills'],
    ['Kino', 'entertainment'],
    ['Prezent dla mamy', 'gifts'],
    ['Apteka', 'health'],
    ['Coffee', 'food_and_drink'],
    ['Weekly groceries', 'groceries'],
  ])('guesses %j as %s', (title, expected) => {
    expect(guessCategory(title)).toBe(expected)
  })

  it('returns null when nothing matches', () => {
    expect(guessCategory('Xyz 123')).toBeNull()
    expect(guessCategory('')).toBeNull()
  })
})
