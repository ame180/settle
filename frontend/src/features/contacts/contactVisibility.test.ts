import { describe, expect, it } from 'vitest'
import type { ContactListItem } from '@/api/types'
import { isHiddenAsSettled } from './contactVisibility'

const now = new Date('2026-11-05T12:00:00Z')

function contact(balances: ContactListItem['balances'], lastActivityAt: string): ContactListItem {
  return {
    person: { id: 1, displayName: 'Anna', email: 'anna@example.com' },
    nickname: null,
    name: 'Anna',
    isRegistered: true,
    balances,
    lastActivityAt,
  }
}

describe('isHiddenAsSettled', () => {
  it('hides a zero-balance contact inactive for more than 30 days', () => {
    expect(isHiddenAsSettled(contact([], '2026-10-06T11:59:59Z'), now)).toBe(true)
  })

  it('keeps a zero-balance contact active within 30 days', () => {
    expect(isHiddenAsSettled(contact([], '2026-10-06T12:00:00Z'), now)).toBe(false)
  })

  it('keeps an old contact with a balance in any currency', () => {
    expect(
      isHiddenAsSettled(
        contact([{ currency: 'EUR', amount: '3.00' }], '2025-01-01T00:00:00Z'),
        now,
      ),
    ).toBe(false)
  })
})
