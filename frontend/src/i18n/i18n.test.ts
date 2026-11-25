import { afterEach, describe, expect, it } from 'vitest'
import { formatDateLabel } from '@/lib/dates'
import { activateLocale, resolveLocale } from './i18n'

afterEach(async () => {
  await activateLocale('en')
})

describe('resolveLocale', () => {
  it.each([
    [['pl-PL', 'en-US'], 'pl'],
    [['de-DE', 'PL'], 'pl'],
    [['en-GB', 'pl'], 'en'],
    [['de-DE'], 'en'],
    [[], 'en'],
  ])('picks %j as %s', (languages, expected) => {
    expect(resolveLocale(languages)).toBe(expected)
  })
})

describe('activateLocale', () => {
  it('loads the Polish catalog and marks the document language', async () => {
    await activateLocale('pl')
    expect(formatDateLabel('2026-11-05', new Date(2026, 10, 5, 12))).toBe('Dzisiaj')
    expect(document.documentElement.lang).toBe('pl')
  })
})
