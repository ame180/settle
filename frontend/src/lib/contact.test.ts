import { describe, expect, it } from 'vitest'
import type { ContactListItem } from '@/api/types'
import { contactSecondaryLine, settleUpPath, shortName } from './contact'

function contact(overrides: Partial<ContactListItem> = {}): ContactListItem {
  return {
    person: { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' },
    nickname: null,
    name: 'Anna Kowalska',
    isRegistered: true,
    balances: [],
    lastActivityAt: '2026-10-20T12:00:00+00:00',
    ...overrides,
  }
}

describe('settleUpPath', () => {
  it('has them pay the full balance when they owe you', () => {
    expect(settleUpPath(2, '192.92')).toBe('/add?tab=payment&contact=2&amount=192.92&payer=them')
  })

  it('has you pay the absolute balance when you owe them', () => {
    expect(settleUpPath(7, '-1535.64')).toBe('/add?tab=payment&contact=7&amount=1535.64&payer=me')
  })
})

describe('contactSecondaryLine', () => {
  it('shows only the email when the display name is their own name', () => {
    expect(contactSecondaryLine(contact())).toBe('anna@example.com')
  })

  it('adds their own name when a nickname replaces it', () => {
    const nicknamed = contact({
      person: { id: 2, displayName: 'Ania', email: 'anna@example.com' },
      nickname: 'Ania',
    })
    expect(contactSecondaryLine(nicknamed)).toBe('Anna Kowalska · anna@example.com')
  })

  it('stays empty when the email is already the display name', () => {
    const emailOnly = contact({
      person: { id: 3, displayName: 'tomek@example.com', email: 'tomek@example.com' },
      name: null,
    })
    expect(contactSecondaryLine(emailOnly)).toBe('')
  })
})

describe('shortName', () => {
  it('takes the first word', () => {
    expect(shortName('Aleksandra Grzegorzewska-Nowak')).toBe('Aleksandra')
  })
})
