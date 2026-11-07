import { describe, expect, it } from 'vitest'
import { formatPln } from '@/lib/money'
import { clearingPayer, describeBalance, describePayment, paymentEffect } from './paymentModel'

const zl = (amount: string) => formatPln(amount)

describe('paymentEffect', () => {
  it('moves the balance towards the user when they pay', () => {
    expect(paymentEffect('me', 5000n)).toBe(5000n)
    expect(paymentEffect('them', 5000n)).toBe(-5000n)
  })
})

describe('describePayment', () => {
  it('settles up', () => {
    expect(describePayment(19292n, 0n, 'Anna')).toEqual({
      tone: 'settles',
      title: 'You and Anna will be settled up',
      detail: `Anna owes you ${zl('192.92')} now.`,
    })
  })

  it('pays part of it', () => {
    expect(describePayment(19292n, 9292n, 'Anna')).toEqual({
      tone: 'reduces',
      title: `Anna will still owe you ${zl('92.92')}`,
      detail: `Anna owes you ${zl('192.92')} now.`,
    })
  })

  it('warns when the payment adds to the debt', () => {
    expect(describePayment(19292n, 24292n, 'Anna')).toEqual({
      tone: 'warns',
      title: `Anna will owe you ${zl('242.92')}`,
      detail: `This adds to what Anna already owes you (${zl('192.92')}).`,
    })
  })

  it('warns when the payment overshoots and flips who owes', () => {
    expect(describePayment(10000n, -5000n, 'Anna')).toEqual({
      tone: 'warns',
      title: `You’ll owe Anna ${zl('50.00')}`,
      detail: `That’s more than Anna owes you (${zl('100.00')}).`,
    })
  })

  it('warns when the two are settled up already', () => {
    expect(describePayment(0n, -5000n, 'Anna')).toMatchObject({
      tone: 'warns',
      detail: 'You and Anna are settled up now.',
    })
  })
})

describe('clearingPayer', () => {
  it('picks who pays to clear the balance', () => {
    expect(clearingPayer(100n)).toBe('them')
    expect(clearingPayer(-100n)).toBe('me')
  })
})

describe('describeBalance', () => {
  it('says where the two stand', () => {
    expect(describeBalance(19292n, 'Anna')).toBe(`Anna owes you ${zl('192.92')} now.`)
    expect(describeBalance(-500n, 'Anna')).toBe(`You owe Anna ${zl('5.00')} now.`)
    expect(describeBalance(0n, 'Anna')).toBe('You and Anna are settled up now.')
  })
})
