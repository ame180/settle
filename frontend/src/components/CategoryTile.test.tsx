import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { expenseCategories } from '@/lib/categories'
import { TestI18nProvider } from '@/test/i18n'
import { CategoryTile } from './CategoryTile'

describe('CategoryTile', () => {
  it('covers every API category in palette order', () => {
    expect(expenseCategories).toEqual([
      'groceries',
      'food_and_drink',
      'transport',
      'home_and_bills',
      'entertainment',
      'gifts',
      'health',
      'general',
    ])
  })

  it('names the category for screen readers and uses its fill', () => {
    render(
      <TestI18nProvider>
        <CategoryTile category="food_and_drink" />
      </TestI18nProvider>,
    )

    const tile = screen.getByRole('img', { name: 'Food & drink' })
    expect(tile).toHaveClass('bg-category-food-and-drink')
  })
})
